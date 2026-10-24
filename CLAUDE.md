# CLAUDE.md

Instrucciones para Claude Code en este repositorio (Vitaclip).

## Qué es
Vitaclip, «el portapapeles supervitaminado»: aplicación de escritorio (Tauri v2) para Windows, macOS y Linux. Un atajo global
que elige el usuario en Ajustes (sugerencia inicial `Ctrl+Alt+V`; ninguno impuesto) abre un popup con el historial del portapapeles, fragmentos, transformaciones de texto,
calculadora, generadores, colores y QR. Funciones Pro con licencia Ed25519 sin conexión (IA, bóveda cifrada, acciones, plantillas con
campos, historial ilimitado). Diseño completo: `docs/specs/2026-10-24-vitaclip-diseno.md`.

## Estructura
- `src/`: interfaz **sin paso de build** (HTML + CSS + módulos ES). `index.html` (popup), `ajustes.html`, `css/vitaclip.css`,
  `js/api.js` (única puerta a Rust), `js/dom.js` (`el()`), `js/i18n.js` (es/en), `js/popup.js`, `js/ajustes.js`,
  `js/herramientas/*.js` (funciones puras: transformar, calcular, generar, color, variables, buscar, acciones).
- `src-tauri/src/`: `lib.rs` (arranque, plugins, bandeja, ventanas), `estado.rs`, `db.rs` (SQLite), `vigia.rs` (hilo del portapapeles),
  `pegar.rs` (copiar + simular Ctrl/Cmd+V), `atajo.rs`, `licencia.rs`, `boveda.rs`, `ia.rs`, `qr.rs`, `comandos.rs`.
- `tests/`: pruebas de JS (`node --test tests/`). Las de Rust van en cada módulo (`cargo test`).
- `scripts/licencia.mjs`: emitir licencias con la clave privada, que vive **fuera** del repo (`~/homelab/.claves-vitaclip/`).
- `.github/workflows/`: `ci.yml` (pruebas en cada push) y `release.yml` (instaladores de los 3 sistemas al subir una etiqueta `v*`).

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
- **Las funciones Pro se comprueban en Rust** (`estado.exigir_pro()`), no solo en la interfaz.
- Nunca subir la clave privada de licencias ni licencias emitidas. Nada de datos personales en el repo (es público): usa
  `ana@example.com` y similares en pruebas y ejemplos.
- Sin telemetría. La única red es la IA que configure el usuario, y la llama Rust (la clave de IA nunca vuelve entera a la interfaz).
- Dependencias mínimas; nada de frameworks de interfaz.
- Estética: minimalista y productiva. Tokens de color en `:root` con modo oscuro; una sola fuente del sistema; nada de sombras pesadas.
- Commits terminan con la línea `Co-Authored-By: ...` que indique el entorno, y dicen qué modelo hizo cada parte.

## Trabajo con varios modelos
Ver `AGENTS.md` → «Reparto del trabajo». Claude diseña, se ocupa de la seguridad (licencia, bóveda, CSP, capacidades de Tauri),
integra, prueba y publica; el trabajo pesado lo hacen los modelos delegados con OpenCode.

## Memoria del proyecto
Decisiones y medidas en `MEMORY.md`; capacidades y recetas en `SKILLS.md`.
