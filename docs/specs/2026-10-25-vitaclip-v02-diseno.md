# Vitaclip 0.2: diseño (2026-10-25)

Cambios pedidos por Alberto tras probar la 0.1 en Windows. Este documento **sustituye** lo que contradiga al diseño de la 0.1
(`2026-10-24-vitaclip-diseno.md`), que sigue valiendo para todo lo demás (historial, búsqueda, fragmentos, transformaciones, bóveda, IA,
seguridad y CSP).

## 1. Qué cambia
1. **Todo gratis, sin licencia ni Pro.** Desaparecen `licencia.rs`, `exigir_pro`, los comandos `licencia_*`, `scripts/licencia.mjs`, los
   candados, el chip PRO/Gratis y la sección Licencia. Licencia del código: **MIT**. Límites para todos: historial configurable de 10 a
   10 000 entradas (por defecto 500), imágenes de hasta 20 MB. La IA y la bóveda siguen, gratis.
2. **Arreglo del atajo en Windows.** Diagnóstico: al mostrar la ventana desde un atajo global, Windows puede negarle el primer plano y la
   ventana recibe enseguida `Focused(false)`, así que se ocultaba sola (desde la bandeja funcionaba). Solución: (a) ignorar la pérdida de
   foco durante 500 ms tras mostrar; (b) en Windows, tras `show()`, `set_focus()` y un segundo intento a los 60 ms si no tiene el foco;
   (c) prueba automática en un Windows de GitHub Actions que pulsa el atajo y comprueba que la ventana queda visible.
3. **Ventana sutil, como Ditto.** Por defecto 380×480 (mínimo 300×320), se puede **mover** (arrastrando la cabecera) y **redimensionar**
   (asa en la esquina). Dos modos en Ajustes → General: «Junto al ratón» (por defecto: aparece en el puntero, sin salirse de la
   pantalla) o «Recordar posición» (vuelve donde la dejaste, con su tamaño). La lista ocupa todo el ancho; el detalle y las
   transformaciones se abren al pulsar `→`/`Tab` o con doble clic, en un panel que sustituye a la lista (`←`/`Esc` vuelve).
4. **Fuera las herramientas inútiles:** se quitan la pestaña Herramientas, los generadores y las acciones personalizadas (comandos
   `acciones_*`). La calculadora sigue en el buscador (`=`).
5. **Capturas de pantalla (estilo Lightshot)** con su propio atajo (sugerencia `CommandOrControl+Alt+KeyC`): se congela la pantalla del
   monitor donde está el ratón, se oscurece, arrastras para elegir la zona y aparece una barra con **lápiz, línea, flecha, rectángulo,
   marcador, texto, color, deshacer**, **Copiar** (`Ctrl+C` o `Enter`: va al portapapeles y por tanto al historial), **Guardar** (`Ctrl+S`:
   PNG en la carpeta de capturas) y **Cerrar** (`Esc`).
6. **Grabación de vídeo** con su propio atajo (sugerencia `CommandOrControl+Alt+KeyR`): el mismo selector de zona en modo vídeo
   («Grabar zona» con `Enter` o «Pantalla completa» con `F`). Mientras graba, un indicador pequeño (punto rojo, tiempo y botón Detener)
   y el mismo atajo detiene. Se guarda un **MP4 H.264** en la carpeta que elija el usuario (por defecto `Vídeos/Vitaclip`), con la
   **máxima calidad posible**: resolución nativa, 30 o 60 fps (ajustable) y calidad «Alta» o «Máxima». Sin audio en esta versión.
7. **Pestaña Capturas** en el popup (sustituye a Herramientas): botones «Capturar zona» y «Grabar vídeo»/«Detener» con su atajo, y la
   lista de capturas y vídeos recientes (abrir carpeta, mostrar archivo, copiar imagen).
8. Órdenes para atajos del sistema (Wayland): `vitaclip --mostrar`, `vitaclip --captura`, `vitaclip --video`.

## 2. Técnica (comprobada en la Pi el 25/10)
- **`xcap` 0.9.8**: `Monitor::from_point(x, y)`, `capture_image()` (RGBA; 276 ms en Wayland, 23 ms en X11) y
  `video_recorder() -> (VideoRecorder, Receiver<Frame>)` con `start()`/`stop()`; `Frame {width, height, raw}` siempre en RGBA. Windows
  (DXGI), macOS y Linux (X11 con xcb; Wayland con PipeWire vía portal, que muestra el diálogo de elegir pantalla del sistema).
- **`openh264` 0.9** (compila el código de Cisco; BSD): `EncoderConfig::new().usage_type(UsageType::ScreenContentRealTime)` (¡el
  NonRealTime falla la validación!) `.rate_control_mode(RateControlMode::Quality)`, sin `profile(High)` (no lo admite: sale Constrained
  Baseline). `YUVBuffer::from_rgb_source(RgbaSliceU8::new(&rgba, (w, h)))` con ancho y alto pares.
- **`muxide` 0.5** (MP4 en Rust puro): `MuxerBuilder::new(archivo).video(VideoCodec::H264, w, h, fps).build()`, `write_video(pts_segundos,
  &annexb, es_clave)` con PTS estrictamente crecientes, `finish()`.
- Prueba real: 3 s de Xvfb 1920×1080 → 129 fotogramas, MP4 válido (`ffprobe`: h264, 1920×1080, 129 fotogramas, 3,0 s). En la Pi
  codificar va más lento que el tiempo real (6,7 s para 3 s, un hilo): por eso la codificación va en su propio hilo con cola acotada que
  descarta fotogramas si se atasca (el MP4 admite ritmo variable) y `num_threads` del codificador según los núcleos.
- Plugins nuevos de Tauri (solo desde Rust): `tauri-plugin-dialog` (elegir carpeta), `tauri-plugin-opener` (abrir carpeta / mostrar
  archivo), `tauri-plugin-notification` (aviso «Vídeo guardado»).
- Linux necesita al compilar `libpipewire-0.3-dev`, `clang`/`libclang-dev`, `libgbm-dev`, `libegl-dev`, `libxcb-randr0-dev`, `libdbus-1-dev`.

## 3. Contrato nuevo entre interfaz y Rust
Se mantienen los comandos de la 0.1 salvo: **se eliminan** `licencia_estado`, `licencia_activar`, `licencia_quitar`, `acciones_listar`,
`accion_guardar`, `accion_borrar`. Ningún comando exige ya licencia.

`Ajustes` (camelCase, con `#[serde(default)]`):
```
atajos:   { popup: "CommandOrControl+Alt+KeyV", captura: "CommandOrControl+Alt+KeyC", video: "CommandOrControl+Alt+KeyR" }  ("" = desactivado)
ventana:  { modo: "raton" | "recordar", x: i32|null, y: i32|null, ancho: u32 (380), alto: u32 (480) }
capturas: { carpeta: "" }                          ("" = Imágenes/Vitaclip)
video:    { carpeta: "", fps: 30 | 60, calidad: "alta" | "maxima" }   ("" = Vídeos/Vitaclip)
limiteHistorial: 500   (10..10000)
tema, idioma, pegarAuto, arrancarConSistema, pausado, ignorar, ia   (igual que en la 0.1)
```
Migración: si los ajustes guardados traen el campo antiguo `atajo`, pasa a `atajos.popup`.
`ajustes_guardar` registra los tres atajos; si alguno falla devuelve «El atajo de {Abrir Vitaclip|Captura|Vídeo} no es válido o ya lo
usa otra aplicación.» y deja todos como estaban. Dos acciones con la misma combinación → error «Dos acciones no pueden usar el mismo atajo.».

| Comando | Entrada | Salida |
|---|---|---|
| `captura_iniciar` | `{modo: "imagen" \| "video"}` | `()` — congela el monitor del ratón y abre la ventana `captura` a pantalla completa en ese monitor |
| `captura_info` | — | `{modo, ancho, alto, escala}` (píxeles físicos de la imagen congelada) |
| `captura_imagen` | — | `string` data URL PNG de la pantalla congelada |
| `captura_copiar` | `{png}` (base64 sin prefijo) | `()` — copia la imagen (entra en el historial) y cierra |
| `captura_guardar` | `{png}` | `string` ruta del PNG guardado (`vitaclip-AAAA-MM-DD_HH-MM-SS.png`) y cierra |
| `captura_cancelar` | — | `()` |
| `video_iniciar` | `{region: {x, y, ancho, alto} \| null}` (píxeles físicos dentro del monitor congelado; null = completo) | `()` — cierra la ventana de captura, empieza a grabar y abre el indicador `grabacion` |
| `video_parar` | — | `string` ruta del MP4 |
| `video_estado` | — | `{grabando: bool, segundos: f64}` |
| `capturas_recientes` | `{limite}` | `[{ruta, nombre, tipo: "imagen"\|"video", tamano, creado}]` (de las dos carpetas, más reciente primero) |
| `carpeta_abrir` | `{tipo: "capturas" \| "videos"}` | `()` (la crea si no existe) |
| `carpeta_elegir` | `{tipo}` | `string \| null` (diálogo de carpeta; guarda en ajustes si se elige) |
| `archivo_mostrar` | `{ruta}` | `()` (solo rutas dentro de las dos carpetas) |
| `archivo_copiar_imagen` | `{ruta}` | `()` (solo PNG de la carpeta de capturas) |

Eventos de Rust: `historial-cambiado`, `popup-mostrado` (como antes), `captura-lista` (a la ventana `captura`, con `captura_info`),
`video-estado` `{grabando, segundos}` (a todas, cada segundo mientras graba y al cambiar), `video-guardado` `{ruta}` y
`video-error` `{mensaje}`.

Ventanas: `popup` (`index.html`), `ajustes` (`ajustes.html`), `captura` (`captura.html`, sin bordes, encima de todo, pantalla completa en
el monitor), `grabacion` (`grabacion.html`, 220×44, sin bordes, encima de todo, arriba en el centro del monitor grabado, arrastrable).
Capacidades: añadir `captura` y `grabacion` a `default.json` y `core:window:allow-start-resize-dragging`.

## 4. Calidad del vídeo
- Resolución nativa del monitor (o de la zona), recortada a ancho y alto pares.
- «Alta»: `RateControlMode::Quality`, `bitrate = ancho × alto × fps × 0,12` bits/s, `QpRange::new(14, 30)`.
  «Máxima»: `bitrate = ancho × alto × fps × 0,25`, `QpRange::new(8, 24)`. Fotograma clave cada 2 s. `num_threads` = núcleos − 1 (máx. 4).
- Ritmo: se toman como mucho `fps` fotogramas por segundo (los que sobran se descartan); PTS = segundos desde el inicio.
- Si el codificador se atasca, la cola (8 fotogramas) descarta los nuevos; nunca se bloquea la captura.
- Al parar: se vacía la cola, `finish()` del MP4, aviso del sistema «Vídeo guardado» y evento `video-guardado`.
- Errores (permiso denegado en macOS, portal cancelado en Wayland, disco lleno): evento `video-error` con mensaje en español y se cierra el indicador.

## 5. Pruebas
- Rust: migración de ajustes (campo `atajo` antiguo), atajos duplicados, recorte de región a pares, ritmo de fotogramas, nombres de
  archivo, `capturas_recientes` sobre una carpeta temporal, rutas fuera de las carpetas rechazadas, y codificar 10 fotogramas sintéticos a
  MP4 y comprobar la cabecera `ftyp`.
- JS: geometría de la selección (normalizar arrastres en cualquier dirección, recortar al borde, escalar a píxeles físicos), herramientas
  de dibujo puras (puntas de flecha), atajos múltiples, textos es/en.
- CI Windows (`prueba-windows.yml`, manual): compila, arranca, pulsa el atajo con `SendInput` y comprueba que la ventana queda visible.
