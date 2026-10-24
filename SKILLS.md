# SKILLS.md

## Capacidades de Vitaclip (v0.1)
| Función | Gratis | Pro |
|---|---|---|
| Historial de texto e imágenes con búsqueda (`img:`, `url:`, `fij:`) | 300 entradas | hasta 10 000 |
| Fijados, pegado con Enter y `Ctrl+1…9` | ✓ | ✓ |
| Fragmentos con variables `{fecha}` `{hora}` `{fecha_hora}` `{portapapeles}` `{uuid}` `{cursor}` | ✓ | ✓ |
| Plantillas con campos `{campo:Nombre}` / `{campo:Empresa\|Acme}` | — | ✓ |
| 22 transformaciones de texto + contador | ✓ | ✓ |
| Calculadora (`=21*1,21`, `200*15%`) | ✓ | ✓ |
| Generadores: UUID, contraseña, fecha ISO, marca Unix, lorem | ✓ | ✓ |
| Colores (HEX/RGB/HSL) y código QR | ✓ | ✓ |
| Acciones personalizadas (regex, transformar, prefijo, sufijo) | — | ✓ |
| IA: traducir, resumir, corregir, formal, cercano, explicar código, orden libre | — | ✓ |
| Bóveda cifrada con contraseña maestra | — | ✓ |
| Imágenes grandes (hasta 20 MB) | 3 MB | ✓ |

## Recetas
### Añadir una transformación
1. En `src/js/herramientas/transformar.js` añade `{ id, clave }` a `TRANSFORMACIONES` y su caso en `transformar()`.
2. Textos en `src/js/i18n.js` (es y en). 3. Prueba en `tests/transformar.test.js`. 4. Actualiza la tabla de arriba y el README.

### Añadir un comando de Rust
1. Función con `#[tauri::command]` en `src-tauri/src/comandos.rs` (si es Pro, `estado.exigir_pro()?` lo primero).
2. Añádelo a `generate_handler!` en `lib.rs`, a `src/js/api.js` y a la tabla del contrato en el spec.
3. Prueba de la lógica en el módulo correspondiente (`cargo test`).

### Emitir una licencia Pro
```bash
node scripts/licencia.mjs emitir --nombre "Nombre" --email cliente@example.com [--caduca 2027-12-31]
```
Nunca pegues licencias ni la clave privada en el repo, en issues ni en commits.

### Publicar una versión
Ver `AGENTS.md` → «Publicar una versión» y la skill `vitaclip-publicar`.
