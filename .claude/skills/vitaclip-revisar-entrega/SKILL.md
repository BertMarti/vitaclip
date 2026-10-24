---
name: vitaclip-revisar-entrega
description: Revisar lo que entrega un modelo delegado en Vitaclip antes de integrarlo (CSP, contrato de comandos, Pro en Rust, pruebas reales).
---

# Revisar una entrega

1. `git status --short` y `git diff --stat` en el worktree: ¿están los archivos que dice?
2. Pruebas: `npm run check && npm test` y `cd src-tauri && cargo test && cargo clippy -- -D warnings`.
3. CSP y seguridad (grep en lo nuevo de `src/`): `innerHTML|outerHTML|insertAdjacentHTML|style=|<style|onclick=|eval\(|new Function` → prohibido.
4. Contrato: cada `invoke("...")` de `src/js/api.js` existe en `generate_handler!` de `lib.rs` con los mismos argumentos (camelCase en JS).
5. Pro: todo comando Pro empieza con `estado.exigir_pro()?`. La clave de IA nunca sale entera de Rust. Nada escribe secretos de la bóveda en logs ni en el historial.
6. Ver la app de verdad: `npm run dev` en la Pi (X11) y probar atajo, copiar, buscar, pegar y ajustes.
7. Arreglos pequeños los hace Claude; rehacer algo grande vuelve al delegado con instrucciones concretas.
