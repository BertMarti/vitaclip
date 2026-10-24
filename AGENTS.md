# AGENTS.md

Guía para cualquier agente de programación (convención agents.md). Léela entera antes de tocar nada.

## Proyecto
Vitaclip: gestor de portapapeles «supervitaminado» para Windows, macOS y Linux hecho con Tauri v2. Rust en `src-tauri/src/`,
interfaz sin build en `src/`, pruebas de JS en `tests/`. El diseño y el contrato entre interfaz y Rust están en
`docs/specs/2026-10-24-vitaclip-diseno.md`: respétalo al pie de la letra (nombres de comandos, campos y eventos).

## Comandos
- Pruebas JS: `node --test tests/` · sintaxis: `npm run check`
- Rust: `cd src-tauri && cargo test` y `cargo clippy -- -D warnings` (si tu entorno no permite cargo, al menos revisa con cuidado los tipos)
- Abrir la app: `npm run dev`

## Reglas de código
- Español de España en interfaz, comentarios y documentación. Textos visibles solo a través de `src/js/i18n.js` (claves en `es` y `en`).
- CSP estricta: prohibido `innerHTML`/`outerHTML`/`insertAdjacentHTML` con datos, `style=`, `<style>`, `onclick=` y scripts en línea.
  Crea nodos con `el()` de `src/js/dom.js` y usa `textContent`. Clases CSS para todo; si hace falta un valor dinámico, `elemento.style.prop = ...` desde JS.
- La interfaz solo llama a Rust desde `src/js/api.js`.
- Funciones de `src/js/herramientas/` puras (sin DOM ni Tauri) y con prueba en `tests/`.
- Rust: errores como `Result<T, String>` con mensajes en español listos para enseñar; nada de `unwrap()` fuera de pruebas salvo
  en cosas imposibles (y con comentario). Las funciones Pro llaman a `estado.exigir_pro()?` al principio.
- No toques `src-tauri/src/licencia.rs`, `src-tauri/src/boveda.rs`, `tauri.conf.json` ni `capabilities/` salvo que el encargo lo diga.
- No hagas commit ni push; no instales nada global; no salgas de tu carpeta. Eso lo hace el orquestador.
- Nada de secretos ni datos personales: en ejemplos y pruebas usa `ana@example.com`, `sk-prueba`, etc.

## Reparto del trabajo
Regla de Alberto (10/10/2026) para todos sus proyectos: el orquestador (Claude Code) no escribe el trabajo pesado.

| Trabajo | Lo hace | Cómo |
|---|---|---|
| Rust o interfaz nuevos (más de ~50 líneas) | `openai/gpt-5.6-luna` | `opencode run --agent delegado` en un worktree `~/homelab/.wt/vitaclip-<tarea>` con encargo cerrado |
| Documentación (README, guías) | `google/gemini-3-flash-preview` (o 3.5/3.7 Flash) | `--agent delegado`, solo `.md` |
| Pruebas extra | Zen gratis: `opencode/big-pickle`, `opencode/mimo-v2.6-flash-free` | `--agent delegado` |
| Revisión cruzada (seguridad y errores) | `google/gemini-3.7-flash` | `--agent plan`, solo lectura |
| Diseño, seguridad (licencia, bóveda, CSP, capacidades), integración, arreglos pequeños, pruebas reales, commit y publicación | Claude | — |

Las sesiones lanzadas con `opencode run` se ven también en la aplicación de escritorio de OpenCode (comparten la base de datos de
`~/.local/share/opencode`). Si un delegado falla dos veces la misma tarea, la termina Claude y lo dice.

## Publicar una versión
1. Sube la versión en `package.json`, `src-tauri/Cargo.toml` y `src-tauri/tauri.conf.json`.
2. `git tag v0.X.Y && git push --tags`: `release.yml` compila en GitHub Actions y deja un borrador de versión con los instaladores.
3. Revisa el borrador en GitHub y publícalo.
