# SKILLS.md

## Capacidades de Vitaclip (0.2, todo gratis)
| Función | Cómo |
|---|---|
| Historial de texto e imágenes (10-10 000 entradas, 500 por defecto) | Atajo de abrir; búsqueda con `img:`, `url:`, `fij:` |
| Pegar | `Enter`, `Ctrl+1…9`; `→`/`Tab` abre el detalle |
| Fragmentos con variables y `{campo:…}` | Pestaña Fragmentos; `;abreviatura` en el buscador |
| 22 transformaciones, contador, QR y colores | Panel de detalle |
| Calculadora | `=21*1,21` en el buscador |
| Captura de zona con anotaciones (lápiz, línea, flecha, rectángulo, marcador, texto) | Atajo de captura o `vitaclip --captura` |
| Grabación de vídeo MP4 H.264 (zona o pantalla, 30/60 fps, Alta/Máxima, sin audio) | Atajo de vídeo o `vitaclip --video` |
| Bóveda cifrada | Pestaña Bóveda |
| IA (Ollama, Groq, Gemini, OpenRouter, OpenAI) | Panel de detalle; se configura en Ajustes → IA |

## Recetas
### Añadir una transformación
1. En `src/js/herramientas/transformar.js` añade `{ id, clave }` a `TRANSFORMACIONES` y su caso en `transformar()`.
2. Textos en `src/js/i18n.js` (es y en). 3. Prueba en `tests/transformar.test.js`. 4. Actualiza la tabla de arriba y el README.

### Añadir un comando de Rust
1. Función con `#[tauri::command]` en `src-tauri/src/comandos.rs` (si crea ventanas o tarda, `async`).
2. Añádelo a `generate_handler!` en `lib.rs`, a `src/js/api.js` y a la tabla del contrato en el spec.
3. Prueba de la lógica en el módulo correspondiente (`cargo test`).

### Probar los atajos en Windows de verdad
`gh workflow run prueba-windows.yml -R BertMarti/vitaclip --ref main` y mira el registro: pulsa `Ctrl+Alt+V` y `Ctrl+Shift+Ñ` con
teclado español en un Windows de GitHub Actions y comprueba que el popup queda visible.

### Probar capturas y vídeo en la Pi
En Wayland la grabación pide elegir pantalla al portal y la Pi no tiene selector: prueba en X11 virtual (`Xvfb :99`, `DISPLAY=:99
XDG_SESSION_TYPE=x11 GDK_BACKEND=x11`, sin `WAYLAND_DISPLAY`) y maneja el ratón con `xdotool` (sí permite arrastrar).

### Publicar una versión
Ver `AGENTS.md` → «Publicar una versión» y la skill `vitaclip-publicar`.
