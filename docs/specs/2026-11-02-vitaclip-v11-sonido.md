# Vitaclip 1.1 — sonido en los vídeos

Se suma a los diseños anteriores; en lo que cambie manda este. Origen (2/11/2026): Alberto nota que los vídeos no llevan sonido.

## 1. Qué hace

- Los vídeos graban **el sonido del equipo** (lo que suena por los altavoces: un vídeo, una llamada, avisos) y, si se activa, **el
  micrófono**. Las dos fuentes se mezclan en una sola pista estéreo.
- **Ajustes → Capturas y vídeo**, dos interruptores nuevos:
  - «Grabar el sonido del equipo» (`video.sonidoEquipo`, por defecto **sí**).
  - «Grabar el micrófono» (`video.microfono`, por defecto **no**). Usa el micrófono predeterminado del sistema.
- Si una fuente no se puede abrir (sin permiso, sin dispositivo, sistema que no lo permite), **el vídeo se graba igual** sin esa
  fuente y se avisa una vez con una notificación: «El vídeo se graba sin sonido del equipo: …» / «… sin micrófono: …».
- Con las dos apagadas, el MP4 no lleva pista de audio (como hasta ahora).

## 2. Técnica

### Captura: `cpal` 0.18
- **Sonido del equipo** = flujo de *entrada* abierto sobre el dispositivo de *salida* predeterminado (loopback):
  - Windows: WASAPI loopback (cpal lo hace solo al abrir entrada sobre un dispositivo de salida).
  - macOS 14.6 o posterior: Core Audio process tap (lo hace cpal). En versiones anteriores, se avisa y se graba sin él.
  - Linux: host **PipeWire** de cpal (feature `pipewire`, `cpal::host_from_id(HostId::PipeWire)`): una entrada sobre el sink
    predeterminado captura lo que suena (`stream.capture.sink`). Si PipeWire no está, se avisa y se graba sin él.
- **Micrófono** = dispositivo de entrada predeterminado del mismo host.
- Los `cpal::Stream` se crean, se reproducen y se sueltan **en el mismo hilo** (en algunos sistemas no son `Send`).
- macOS: `src-tauri/Info.plist` con `NSMicrophoneUsageDescription` y `NSAudioCaptureUsageDescription` (Tauri lo mezcla en el
  bundle). Sin ellas macOS cierra la app al pedir el audio.

### Mezcla (funciones puras en `audio.rs`, con pruebas)
- Todo pasa a **48 000 Hz, estéreo, f32**: `a_estereo(muestras, canales)` (mono → duplica; más de 2 → media de los demás en cada
  lado o primeros dos canales, lo que sea más simple y documentado) y un remuestreador lineal con estado entre bloques
  (`Remuestreador::new(de_hz)`, `.procesar(&[f32]) -> Vec<f32>`).
- Cada fuente deja sus muestras en una cola (`Arc<Mutex<VecDeque<f32>>>`, tope 1 s; lo que sobre se tira por el principio).
- **Reloj = el reloj de pared**, el mismo `Instant` de inicio que el vídeo. Un hilo mezclador, cada ~20 ms, escribe bloques de
  1024 muestras por canal mientras `escritas + 1024 <= segundos_transcurridos × 48 000`. Por bloque toma 1024 de cada cola (si
  faltan, rellena con silencio: WASAPI no entrega nada mientras no suena nada) y suma con recorte a [-1, 1]. Si una cola acumula más
  de 0,25 s, se tiran las más antiguas para que no se desfase.
- Así el audio queda pegado al reloj del vídeo aunque los relojes de las tarjetas se desvíen un poco.

### Codificación: AAC-LC con `fdk-aac` 0.8
- AAC se reproduce en todas partes (Windows, macOS/QuickTime, móviles, redes sociales). `fdk-aac` compila la librería de Fraunhofer
  desde su código (sin dependencias del sistema). 48 kHz, estéreo, transporte **ADTS** (lo que pide `muxide`), CBR: 160 kb/s con
  calidad «Alta» y 256 kb/s con «Máxima».
- Licencia: el código de Fraunhofer va con su propia licencia (permite redistribuir con su aviso; no da licencia de patentes).
  Su aviso se copia en `LICENCIAS-TERCEROS.md` en la raíz y se cita desde README → Licencia.

### Mezclado en el MP4 (`video.rs`)
- Un solo canal hacia el hilo que escribe el MP4, con `enum Paquete { Video(f64, xcap::Frame), Audio(f64, Vec<u8>) }`. El vídeo
  sigue con `try_send` (si se atasca, se salta fotogramas, como ahora); el audio con `send` (no se pierde).
- `muxide` exige que el audio **no empiece antes que el primer fotograma**: los paquetes de audio con `pts` menor que el del primer
  fotograma se descartan. Los `pts` de audio son `n × 1024 / 48000` (n = número de paquete AAC), en el reloj compartido.
- Antes de crear el MP4 hay que saber si llevará audio: `audio::iniciar(...)` arranca su hilo y **espera hasta 3 s** a que diga qué
  fuentes abrió (`Vec` de avisos + si hay al menos una). Si no abrió ninguna, el MP4 se crea sin pista de audio.
- Al parar: el mismo `detener` para los dos hilos; el de audio vacía el codificador AAC y suelta su emisor; el MP4 se cierra cuando
  ya no queda ningún emisor.

## 3. Contrato

| Dónde | Qué |
|---|---|
| `db::Video` | `sonido_equipo: bool` (por defecto `true`), `microfono: bool` (por defecto `false`); en JSON `sonidoEquipo` y `microfono`. Ajustes viejos sin estos campos → valores por defecto (prueba) |
| `audio.rs` | `pub struct Fuentes { pub equipo: bool, pub microfono: bool }`; `pub fn iniciar(fuentes, calidad_maxima: bool, inicio: Instant, tx: SyncSender<video::Paquete>, detener: Arc<AtomicBool>) -> Arranque` con `pub struct Arranque { pub hilo: Option<JoinHandle<()>>, pub con_audio: bool, pub avisos: Vec<String> }` |
| Interfaz | `ajustes-capturas.js`: dos `filaAjuste` con `interruptor` que guardan `video.sonidoEquipo` y `video.microfono`; textos `capturasAjustes.sonidoEquipo(+Descripcion)` y `capturasAjustes.microfono(+Descripcion)` en es y en; `ajustes-comun.js` con los valores por defecto |

Sin comandos nuevos (los ajustes ya se guardan con `ajustes_guardar`).

## 4. Pruebas
- `cargo test`: `a_estereo`, remuestreador (44 100 → 48 000 da la longitud esperada ±1 y conserva una senoide), mezcla con recorte,
  cálculo de bloques pendientes, y un MP4 sintético con vídeo + AAC (senoide) que `muxide` acepta.
- En la Pi: grabar con la app real mientras `pw-play` reproduce un tono; `ffprobe` debe ver la pista `aac` 48 kHz estéreo y
  `ffmpeg -af volumedetect` un volumen claramente por encima del silencio; con el interruptor apagado, sin pista de audio.
- Windows (CI): compila; prueba manual de Alberto con un vídeo de YouTube sonando.
- macOS: compila en CI; sin prueba real (se dice en las notas).
