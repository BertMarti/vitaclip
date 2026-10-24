---
name: vitaclip-publicar
description: Publicar una versión de Vitaclip (pruebas, revisión de privacidad, etiqueta, instaladores en GitHub Actions).
---

# Publicar una versión

1. Pruebas completas (skill `vitaclip-revisar-entrega`, paso 2) en verde.
2. Privacidad: `git diff origin/main --stat` y grep de emails, rutas personales, IPs y `VITA1.` en todo el diff. Cualquier coincidencia bloquea
   (nunca `| tail` antes de `git push`: usa `if …; then git push; fi`).
3. Sube la versión en `package.json`, `src-tauri/Cargo.toml` y `src-tauri/tauri.conf.json` (y `Cargo.lock` con `cargo update -p vitaclip`).
4. `git commit`, `git tag vX.Y.Z`, `git push && git push --tags`.
5. Vigila `gh run list --workflow release.yml`; al terminar, `gh release view vX.Y.Z` y publica el borrador (`gh release edit vX.Y.Z --draft=false`).
