# Cómo colaborar

¡Gracias por querer mejorar Vitaclip!

1. **Abre un issue** antes de cambios grandes, para hablarlo primero.
2. Haz un fork, crea una rama y envía un pull request pequeño y centrado en una sola cosa.
3. Antes de enviarlo, todo debe pasar:
   ```bash
   npm run check && npm test
   cd src-tauri && cargo test && cargo clippy -- -D warnings
   ```

## Reglas del proyecto (resumen de [AGENTS.md](AGENTS.md))
- Interfaz, comentarios, documentación y commits **en español de España**. Los textos visibles van en `src/js/i18n.js` (es y en).
- La interfaz no tiene paso de build ni frameworks: HTML, CSS y módulos ES.
- CSP estricta: nada de `innerHTML` con datos, `style=`, `<style>`, `onclick=` ni scripts en línea. Crea nodos con `el()` de `src/js/dom.js`.
- Las herramientas de `src/js/herramientas/` son funciones puras y llevan pruebas en `tests/`.
- La interfaz solo habla con Rust desde `src/js/api.js`; los comandos nuevos se documentan en el contrato de
  `docs/specs/2026-10-24-vitaclip-diseno.md`.
- Las funciones Pro se comprueban en Rust. No se aceptan cambios que quiten o esquiven la comprobación de licencia.
- Nada de datos personales ni secretos en el código, las pruebas o los issues.

Al enviar un pull request aceptas que tu aportación se publique bajo la [Elastic License 2.0](LICENSE) del proyecto.
