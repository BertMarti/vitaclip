# Vitaclip 1.0 — diseño

Se suma a los diseños de la 0.1 (`2026-10-24-vitaclip-diseno.md`) y la 0.2 (`2026-10-25-vitaclip-v02-diseno.md`); en lo que cambie
manda este. Petición de Alberto (31/10/2026): «Sigue mejorando la aplicación para una versión 1».

## 1. Qué entra en la 1.0

1. **Actualizaciones automáticas.** Vitaclip comprueba una vez al día si hay versión nueva en GitHub, avisa y se actualiza con un
   clic, con la descarga verificada por firma. Se puede apagar.
2. **Capturas: dos herramientas nuevas.** «Pixelar» (tapa datos sensibles con un mosaico) y «Numerar» (círculos 1, 2, 3… para
   explicar pasos).
3. **Historial tipo Ditto: editar antes de pegar y pegar varios.** Se cambia un texto antes de pegarlo sin tocar el original, y se
   seleccionan varios elementos para pegarlos de una vez.

Fuera de la 1.0 (para la 1.x): sonido en los vídeos, texto de las capturas (OCR), GIF, sincronización.

## 2. Actualizaciones

### Técnica
- `tauri-plugin-updater` 2, usado **solo desde Rust** (`UpdaterExt`): la interfaz no recibe permisos del plugin, solo los comandos
  propios de abajo. Reinicio con `AppHandle::restart()`.
- Origen fijo: `https://github.com/BertMarti/vitaclip/releases/latest/download/latest.json` (en `tauri.conf.json`). Cada archivo va
  firmado con la clave del actualizador (minisign); la pública está en `tauri.conf.json` y la privada solo en los secretos de GitHub
  (`TAURI_SIGNING_PRIVATE_KEY` y `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`). Una descarga con firma mala no se instala.
- Windows: instalador NSIS en modo `passive` (barra de progreso, sin preguntas). macOS: `.app.tar.gz`. Linux: solo el AppImage se
  puede actualizar solo; con `.deb` o `.rpm` (sin variable `APPIMAGE`) se avisa y se abre la página de descargas.
- Si la firma de Windows de SignPath está activa, `release.yml` vuelve a firmar con la clave del actualizador los instaladores que
  devuelve SignPath y rehace `latest.json`, porque la firma Authenticode cambia el archivo.

### Comportamiento
- Ajuste nuevo `buscarActualizaciones: bool` (por defecto `true`) en **Ajustes → General**.
- Si está activo: primera comprobación 30 s después de arrancar y luego cada 24 h, en un hilo aparte. Sin red o con error: se calla y
  lo vuelve a intentar a la siguiente.
- Al encontrar una versión nueva: evento `actualizacion-disponible` `{version, notas, fecha}`, una notificación del sistema
  «Vitaclip X.Y.Z disponible» (una sola vez por versión) y una entrada en la bandeja **«Actualizar a X.Y.Z»** encima de «Ajustes».
- **Ajustes → General → Actualizaciones:** interruptor, «Versión actual 1.0.0 · Comprobado hace N min» y botón **Buscar ahora**. Si hay
  una nueva: aviso en lo alto de los ajustes «Hay una versión nueva: X.Y.Z», con **Ver novedades** (abre la página de la versión) y
  **Actualizar y reiniciar** (o **Descargar** si no se puede instalar sola). Durante la descarga, una barra de progreso.
- Privacidad: la comprobación solo pide `latest.json` a GitHub (no envía datos de la persona). README y USO lo dicen.

### Contrato

| Comando | Parámetros | Devuelve |
|---|---|---|
| `actualizacion_estado` | — | `{actual, disponible: {version, notas, fecha} \| null, comprobado: number \| null (ms), instalable: bool, buscando: bool}` |
| `actualizacion_buscar` | — | igual que `actualizacion_estado` (async; comprueba ya, aunque el ajuste esté apagado) |
| `actualizacion_instalar` | — | `()` (async): descarga, verifica, instala y reinicia. Error en español si falla |
| `actualizacion_pagina` | — | `()` abre `https://github.com/BertMarti/vitaclip/releases/latest` (dirección fija en Rust) |

Eventos: `actualizacion-disponible` `{version, notas, fecha}` · `actualizacion-progreso` `{descargado, total \| null}`.
Comandos solo en la ventana `ajustes` (capacidad `ajustes.json`).

## 3. Capturas: Pixelar y Numerar

- `HERRAMIENTAS` pasa a `['lapiz', 'linea', 'flecha', 'rectangulo', 'marcador', 'texto', 'pixelar', 'numero']`.
- **Pixelar** `{tipo: 'pixelar', x1, y1, x2, y2, grosor}`: se arrastra un rectángulo y lo de debajo se ve en bloques. Tamaño del bloque
  según el grosor elegido: 6, 10 o 16 px en pantalla (escalado al exportar, igual que los trazos). Cada bloque toma el color medio de
  la imagen congelada en esa zona (no de las anotaciones). Se pinta antes que las demás anotaciones, para que una flecha encima se vea.
  Es destructivo en el PNG exportado: no queda el original debajo.
- **Numerar** `{tipo: 'numero', x, y, color, grosor}`: un clic pone un círculo relleno con el siguiente número (1, 2, 3…, según el
  orden de las anotaciones `numero`; deshacer quita el último). Diámetro según el grosor: 22, 28 o 36 px. Número en blanco, o en
  negro si el color es blanco o amarillo.
- Atajos de herramienta existentes si los hay; iconos en `iconos.js`; textos «Pixelar» / «Pixelate» y «Numerar» / «Number».
- Funciones puras nuevas en `herramientas/dibujo.js` (con prueba): `bloquePixelado(grosor)`, `numeroDe(anotaciones, indice)`,
  `colorNumero(color)`, y `esUtil`/`escalarAnotacion` cubren los tipos nuevos.

## 4. Historial: editar antes de pegar y pegar varios

- **Editar:** en el detalle de un texto, botón **Editar** (y tecla `E` cuando el foco está en el detalle). El texto pasa a un cuadro
  editable; `Ctrl+Enter` (`⌘↩` en Mac) pega lo editado con `texto_pegar` (el original no cambia; lo pegado entra en el historial como
  cualquier copia) y `Esc` cancela. Las transformaciones se aplican sobre lo editado.
- **Pegar varios:** `Shift+↑/↓` amplía la selección desde el elemento actual; `Ctrl+clic` (`⌘+clic`) añade o quita uno. Con 2 o más
  seleccionados, el pie dice «N seleccionados · Enter pega todo» y `Enter` pega los **textos** en el orden de la lista, unidos por un
  salto de línea, con una sola llamada a `texto_pegar` (las imágenes seleccionadas se saltan; si solo hay imágenes, aviso «Solo se
  pueden pegar varios textos a la vez»). `Esc` quita la selección; cambiar la búsqueda también. `Supr` con varios seleccionados
  borra todos (con la misma confirmación que ya haya).
- Funciones puras en `herramientas/seleccion-lista.js` (con prueba): ampliar, alternar y unir textos.

## 5. Pruebas

- `npm test` con las funciones puras nuevas; `cargo test` y `cargo clippy -- -D warnings`.
- Actualizaciones: prueba real publicando la 1.0.0 y después una 1.0.1 de prueba: la 1.0.0 instalada en el Windows de
  `prueba-windows.yml` debe encontrarla, instalarla y quedar en 1.0.1.
- Capturas y selección múltiple: en la Pi (Xvfb) y en el simulador del navegador.
