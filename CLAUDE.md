# CLAUDE.md

Instrucciones para Claude Code en este repositorio (Vitaclip).

## Qué es
Vitaclip, «el portapapeles supervitaminado»: aplicación de escritorio (Tauri v2) para Windows, macOS y Linux, **gratis y MIT**, sin
licencias ni funciones de pago. Junta tres cosas con tres atajos que elige el usuario (sugerencias `Ctrl+Alt+V`, `Ctrl+Alt+C` y
`Ctrl+Alt+R`): un historial del portapapeles tipo Ditto (búsqueda, fragmentos, transformaciones, calculadora, QR, bóveda cifrada e IA
opcional), capturas de pantalla con anotaciones tipo Lightshot y grabación de vídeo a MP4. Diseño: `docs/specs/2026-10-24-vitaclip-diseno.md`
(base) y `docs/specs/2026-10-25-vitaclip-v02-diseno.md` (0.2, manda en lo que cambie).

## Estructura
- `src/`: interfaz **sin paso de build** (HTML + CSS + módulos ES). Páginas: `index.html` (popup), `ajustes.html`, `captura.html`
  (editor de capturas), `grabacion.html` (indicador). `css/` partido por zonas. `js/api.js` (única puerta a Rust), `js/dom.js` (`el()`),
  `js/i18n.js` + `textos-es.js`/`textos-en.js`, `js/popup*.js`, `js/ajustes*.js`, `js/captura*.js`, `js/grabacion.js`, `js/simulador*.js`
  (para ver la interfaz en un navegador) y `js/herramientas/*.js` (funciones puras con pruebas).
- `src-tauri/src/`: `lib.rs` (arranque, plugins, bandeja, argumentos), `estado.rs`, `db.rs` (SQLite y ajustes con migración), `vigia.rs`
  (hilo del portapapeles), `pegar.rs`, `atajo.rs` (tres atajos y colocación de la ventana), `teclado.rs` (atajos por tecla física en
  cualquier distribución), `captura.rs` (pantalla congelada + ventana de captura), `video.rs` (xcap → openh264 → MP4 con muxide),
  `boveda.rs`, `ia.rs`, `llavero.rs` (clave de IA en el llavero del sistema), `sensible.rs` (marcas «no guardar» de los
  gestores de contraseñas), `qr.rs`, `util.rs` (`crear_nuevo`, `error_es`), `comandos.rs`.
- `src-tauri/capabilities/<ventana>.json`: cada ventana solo puede llamar a los comandos que usa.
- `tests/`: pruebas de JS (`npm test`). Las de Rust van en cada módulo (`cargo test`).
- `.github/workflows/`: `ci.yml` (pruebas en cada push), `release.yml` (instaladores al subir una etiqueta `v*`) y `prueba-windows.yml`
  (manual: pulsa los atajos de verdad en un Windows, también con teclado español).

## Ejecutar y probar
```bash
source ~/.cargo/env
npm install
npm test                         # pruebas de JS
npm run check                    # sintaxis de todos los .js
(cd src-tauri && cargo test)     # pruebas de Rust
(cd src-tauri && cargo clippy -- -D warnings)
npm run dev                      # abre la app (necesita escritorio)
npm run build                    # instaladores del sistema actual en src-tauri/target/release/bundle/
```
En la Raspberry (Linux arm64) compilar en release tarda bastante: lánzalo en segundo plano.

## Convenciones
- Interfaz, documentación, comentarios y commits en español de España. Textos de la interfaz siempre por `i18n.js` (es y en).
- CSP estricta (`tauri.conf.json`): nada de `<style>`, atributos `style=`, scripts en línea ni `onclick`. DOM con `el()` y
  `textContent`; **nunca** `innerHTML` con datos (los clips son datos no confiables). Los SVG del QR se insertan como imagen `data:`.
- La interfaz solo habla con Rust por `js/api.js`. Un comando nuevo: se añade en `comandos.rs`, en `generate_handler!` de `lib.rs`,
  en `api.js` y en la tabla del contrato del spec.
- Crear ventanas solo desde comandos `async` o hilos (en Windows, crearlas desde un comando síncrono bloquea Tauri). Nada pesado en el
  hilo principal: capturar, grabar y parar un vídeo van en hilos aparte.
- Todo atajo pasa por `teclado::adaptar` antes de registrarse.
- Un comando nuevo: añádelo a `generate_handler!`, a `build.rs` y al `capabilities/<ventana>.json` de la ventana que lo use
  (`npm test` falla si no coinciden). Archivos nuevos con `util::crear_nuevo`, nunca con `File::create` sobre un nombre adivinado.
- Nada de datos personales en el repo (es público): usa `ana@example.com` y similares en pruebas y ejemplos.
- Sin telemetría. La única red es la IA que configure el usuario, y la llama Rust (la clave de IA nunca vuelve entera a la interfaz).
- Dependencias mínimas; nada de frameworks de interfaz.
- Estética: minimalista y productiva. Tokens de color en `:root` con modo oscuro; una sola fuente del sistema; nada de sombras pesadas.
- Commits terminan con la línea `Co-Authored-By: ...` que indique el entorno, y dicen qué modelo hizo cada parte.

## Trabajo con varios modelos
Ver `AGENTS.md` → «Reparto del trabajo». Claude diseña, se ocupa de la seguridad (bóveda, CSP, capacidades de Tauri),
integra, prueba y publica; el trabajo pesado lo hacen los modelos delegados con OpenCode.

## Memoria del proyecto
Decisiones y medidas en `MEMORY.md`; capacidades y recetas en `SKILLS.md`.
