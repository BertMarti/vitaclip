# Cómo colaborar

¡Gracias por querer mejorar Vitaclip!

1. **Abre un issue** antes de realizar cambios grandes para discutirlo.
2. Haz un fork, crea una rama y envía un pull request pequeño y centrado.
3. Antes de enviarlo, verifica que todo sea correcto:
   ```bash
   npm run check && npm test
   cd src-tauri && cargo test && cargo clippy -- -D warnings
   ```

## Reglas del proyecto (resumen de [AGENTS.md](AGENTS.md))
- Interfaz, comentarios, documentación y commits **en español de España**. Los textos visibles van en `src/js/i18n.js`.
- La interfaz no tiene paso de build: HTML, CSS y módulos ES puros.
- CSP estricta: prohibido `innerHTML` con datos, `style=`, `<style>`, `onclick=` o scripts en línea. Usa `el()` de `src/js/dom.js`.
- Las herramientas en `src/js/herramientas/` deben ser funciones puras con sus respectivas pruebas en `tests/`.
- La interfaz se comunica con Rust exclusivamente a través de `src/js/api.js`.
- No incluyas datos personales ni secretos en el código o en las pruebas.

## Licencia
Al colaborar, aceptas que tus aportaciones se publiquen bajo la licencia **MIT** del proyecto.
