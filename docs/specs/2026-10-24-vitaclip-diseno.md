# Vitaclip: diseño (2026-10-24)

> El portapapeles supervitaminado. Un atajo de teclado **que elige el propio usuario** abre una ventanita como la de Ditto, pero con herramientas
> útiles para el día a día. Gratis y de código abierto; las funciones «Pro» se activan con una licencia (sin pasarela de pago por ahora).

## 1. Qué pidió Alberto y qué se ha supuesto

**Pidió:** una aplicación instalable tipo Ditto, «supervitaminada», con atajo configurable que abre un popup; gratuita y con repositorio
público; las mejores funciones de pago (sin pasarela); ejecutables para Windows, macOS y Linux; todo gratuito, práctico, simple, con
estética minimalista y productiva; flujo habitual (CLAUDE.md, AGENTS.md, MEMORY.md, SKILLS.md, agentes y delegación con OpenCode).

**Supuestos (decididos por Claude con la autonomía que dio Alberto):**
- Nombre **Vitaclip** (clip + vitamina), repositorio `BertMarti/vitaclip`.
- Interfaz en español por defecto, con inglés como segundo idioma (el repo es público).
- Licencia del código: **Elastic License 2.0**, igual que ARIA Premium: se puede usar, leer y modificar gratis, pero no revender ni quitar
  la comprobación de licencia para ofrecerlo como servicio. Así el modelo «gratis + Pro» tiene sentido con el código abierto.
- Sin telemetría ni cuentas. La única conexión a internet es la IA que configure el usuario (función Pro).

**Éxito =** instalar el ejecutable en cualquiera de los tres sistemas, pulsar el atajo, encontrar algo copiado hace días en menos de
dos segundos, transformarlo y pegarlo sin tocar el ratón.

## 2. Tecnología (y por qué)

| Pieza | Elección | Motivo |
|---|---|---|
| Aplicación | **Tauri v2** (Rust + WebView del sistema) | Ejecutables de ~10 MB frente a ~100 MB de Electron; atajos globales, bandeja e instaladores oficiales para los 3 sistemas |
| Interfaz | HTML/CSS/JS **sin paso de build** (módulos ES) | Igual que ARIA: menos dependencias, se lee y se cambia fácil |
| Portapapeles | `arboard` (texto e imágenes) con un hilo que mira cada 400 ms | Funciona igual en los 3 sistemas; no hay evento nativo común |
| Pegar en la app anterior | `enigo` (simula Ctrl/Cmd+V) | Si falla (Wayland sin permisos), queda copiado y se avisa |
| Datos | SQLite con `rusqlite` (`bundled`) en la carpeta de datos del usuario | Un solo archivo, búsquedas rápidas |
| Atajo | `tauri-plugin-global-shortcut` | Configurable en caliente |
| Arranque y una sola instancia | `tauri-plugin-autostart`, `tauri-plugin-single-instance` | `vitaclip --mostrar` abre el popup (útil en Wayland) |
| Licencia | Ed25519 (`ed25519-dalek`), comprobación sin conexión | Igual que ARIA Premium; la clave privada nunca va al repo |
| Bóveda | Argon2id + XChaCha20-Poly1305 | Estándar, sin servidor |
| IA | `reqwest` contra cualquier API compatible con OpenAI (Ollama, Groq, Gemini, OpenRouter, OpenAI) | El usuario usa su clave o su Ollama local; gratis si quiere |
| QR | `qrcode` → SVG | Sin red |
| Compilación | GitHub Actions + `tauri-action` | Gratis en repos públicos; genera `.msi/.exe`, `.dmg`, `.AppImage/.deb/.rpm` |

## 3. Funciones

### Gratis
1. **Historial** de texto e imágenes (hasta 300 entradas; se elimina lo más antiguo no fijado). Sin duplicados: si se copia algo que ya está, sube arriba.
2. **Búsqueda instantánea** difusa al escribir. Filtros rápidos con prefijo: `img:` imágenes, `url:` enlaces, `fij:` fijados.
3. **Teclado primero:** ↑/↓ para moverse, `Enter` pega, `Ctrl+1…9` pega directo, `Ctrl+P` fija, `Supr` borra, `Tab` abre las
   herramientas del elemento, `Esc` cierra. Se cierra solo al perder el foco.
4. **Fijados**: siempre arriba, nunca se borran solos.
5. **Fragmentos** (snippets) con nombre y atajo de texto (`;firma`), con variables `{fecha}`, `{hora}`, `{fecha_hora}`, `{portapapeles}`,
   `{uuid}` y `{cursor}`.
6. **Transformaciones** (pegan el resultado): MAYÚSCULAS, minúsculas, Tipo Título, Tipo oración, camelCase, snake_case, kebab-case,
   quitar espacios sobrantes, una sola línea, ordenar líneas, quitar líneas duplicadas, invertir, JSON bonito, JSON compacto,
   Base64 codificar/decodificar, URL codificar/decodificar, slug, quitar tildes, escapar/desescapar HTML, contar (caracteres, palabras, líneas).
7. **Calculadora**: si lo que escribes empieza por `=`, se calcula (`=21*1,21`), con paréntesis, `%`, `^` y coma o punto decimal. Analizador
   propio: nunca `eval`.
8. **Generadores**: UUID v4, contraseña segura (longitud configurable), fecha ISO, marca de tiempo Unix, lorem ipsum.
9. **Colores**: si un clip es un color (`#1e90ff`, `rgb(…)`, `hsl(…)`), se ve la muestra y se puede pegar en HEX, RGB o HSL.
10. **Código QR** del elemento (se ve en el popup; se puede copiar como imagen).
11. **Ajustes**: atajo totalmente personalizable (se graba pulsando la combinación que quieras; no hay ninguno impuesto), tema (sistema/claro/oscuro), idioma, pegar automáticamente sí/no, arrancar con el sistema,
    pausar la captura, patrones a ignorar (expresiones regulares; por defecto se ignoran cosas con pinta de tarjeta o de token), exportar e importar el historial en JSON.

12. **Bienvenida**: la primera vez se abren los ajustes en la sección Atajo con el mensaje «Elige el atajo que abrirá Vitaclip»; mientras
    no elijas, funciona la sugerencia `Ctrl+Alt+V` (`Cmd+Option+V` en Mac). También se explica cómo usar el comando `vitaclip --mostrar`
    desde un atajo del propio sistema (imprescindible en Wayland).

### Pro (licencia)
1. **IA en el portapapeles**: traducir (es↔en y otros), resumir, corregir ortografía, reescribir más formal o más cercano, explicar código
   y una orden libre. Con la clave del usuario o con Ollama local; se configura el proveedor, la URL, el modelo y la clave.
2. **Bóveda cifrada**: contraseñas y datos sensibles con contraseña maestra. Lo que se pega desde la bóveda no entra en el historial.
   Se bloquea sola a los 5 minutos.
3. **Acciones personalizadas**: cadenas de pasos (buscar y reemplazar con regex, transformación, prefijo y sufijo) guardadas con nombre.
4. **Plantillas con campos**: `{campo:Nombre}` y `{campo:Empresa|Acme}` piden los valores en un mini formulario antes de pegar.
5. **Historial ilimitado** (configurable hasta 10 000 entradas) y conservación de imágenes grandes.

Sin licencia, las funciones Pro se ven con un candado y una explicación; no hay ventanas molestas.

## 4. Arquitectura

```
src/                  interfaz sin build (popup y ajustes)
  index.html          popup
  ajustes.html        ventana de ajustes
  css/vitaclip.css    tokens de color (claro y oscuro), minimalista
  js/api.js           única puerta a Rust (invoke/listen de window.__TAURI__)
  js/dom.js           el(etiqueta, props, ...hijos) y utilidades (nada de innerHTML con datos)
  js/i18n.js          textos es/en
  js/popup.js         lista, búsqueda, teclado, paneles
  js/ajustes.js       formulario de ajustes y licencia
  js/herramientas/    funciones puras y probadas: transformar, calcular, generar, color, variables, buscar, acciones
src-tauri/src/
  lib.rs              arranque: plugins, bandeja, ventanas, estado, comandos
  db.rs               SQLite: clips, fragmentos, acciones, ajustes (clave-valor JSON)
  vigia.rs            hilo que vigila el portapapeles y guarda lo nuevo
  pegar.rs            escribir el portapapeles, ocultar y simular el pegado
  atajo.rs            registrar y cambiar el atajo global
  licencia.rs         verificar licencias Ed25519 (Claude)
  boveda.rs           cifrado de la bóveda (Claude)
  ia.rs               cliente compatible con OpenAI
  qr.rs               SVG de un texto
  comandos.rs         los #[tauri::command]
scripts/licencia.mjs  crear claves y emitir licencias (la privada vive fuera del repo)
tests/                pruebas de JS con node --test
```

### Contrato entre interfaz y Rust (comandos)
Todos devuelven `Result<T, String>`; el texto del error ya va listo para enseñar.

| Comando | Entrada | Salida |
|---|---|---|
| `historial_listar` | `{consulta: string, limite: number}` | `Clip[]` |
| `clip_imagen` | `{id}` | `string` (data URL PNG) |
| `clip_pegar` | `{id}` | `boolean` (copia y oculta; `true` si además pegó, `false` si solo quedó copiado) |
| `texto_pegar` | `{texto}` | `boolean` (igual con un texto ya transformado) |
| `clip_fijar` | `{id, fijado: bool}` | `()` |
| `clip_borrar` | `{id}` | `()` |
| `historial_vaciar` | `{incluirFijados: bool}` | `()` |
| `historial_exportar` / `historial_importar` | — / `{json}` | `string` (ruta del JSON guardado en Descargas) / `number` (importados) |
| `fragmentos_listar` / `fragmento_guardar` / `fragmento_borrar` | — / `Fragmento` / `{id}` | `Fragmento[]` / `Fragmento` / `()` |
| `acciones_listar` / `accion_guardar`(Pro) / `accion_borrar` | — / `Accion` / `{id}` | igual |
| `ajustes_leer` / `ajustes_guardar` | — / `{ajustes}` | `Ajustes` / `Ajustes` |
| `licencia_estado` / `licencia_activar` / `licencia_quitar` | — / `{clave}` / — | `EstadoLicencia` |
| `qr_svg` | `{texto}` | `string` (SVG) |
| `ia_ejecutar` (Pro) | `{accion, texto, extra?}` | `string` |
| `ia_probar` (Pro) | — | `string` (nombre del modelo que respondió) |
| `boveda_estado` / `boveda_crear` / `boveda_desbloquear` / `boveda_bloquear` | — / `{contrasena}` / `{contrasena}` / — | `EstadoBoveda` |
| `boveda_listar` / `boveda_guardar` / `boveda_borrar` / `boveda_pegar` (Pro) | — / `{titulo, secreto}` / `{id}` / `{id}` | `EntradaBoveda[]` (`{id, titulo, creado}`, sin secretos) / `EntradaBoveda` / `()` / `boolean` |
| `ventana_ocultar` / `ajustes_abrir` | — | `()` |
| `pausa_cambiar` | `{pausado: bool}` | `()` |

Tipos (JSON, camelCase):
- `Clip {id, tipo: "texto"|"imagen", texto, ancho?, alto?, creado (ms), usado (ms), usos, fijado}`; en imágenes `texto` es `""`.
- `Fragmento {id, nombre, abreviatura, contenido}` · `Accion {id, nombre, pasos: Paso[]}` con `Paso {tipo: "regex"|"transformar"|"prefijo"|"sufijo", ...}`.
- `Ajustes {atajo, tema, idioma, pegarAuto, arrancarConSistema, pausado, limiteHistorial, ignorar: string[], ia: {proveedor, url, modelo, clave}}`.
  `ajustes_leer` nunca devuelve la clave de IA completa: devuelve `"••••" + últimos 4` y `ajustes_guardar` la conserva si llega así.
- `EstadoLicencia {pro: bool, nombre?, email?, emitida?, caduca?, motivo?}` · `EstadoBoveda {existe, abierta}`.

Eventos de Rust a la interfaz: `historial-cambiado` (sin datos) y `popup-mostrado` (para limpiar la búsqueda y poner el foco).

### Flujo de pegar
1. La interfaz llama a `clip_pegar`. 2. Rust escribe el portapapeles y anota su huella para que el vigía no lo cuente como nuevo
(salvo para subirlo arriba). 3. Oculta el popup (en macOS también la app, para devolver el foco). 4. Espera 120 ms y simula
`Ctrl+V` (`Cmd+V` en macOS) si `pegarAuto`. 5. Si la simulación falla, deja el texto copiado y la interfaz avisa «Copiado; pega con Ctrl+V».

### Seguridad y privacidad
- CSP estricta: `default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'`. Nada de estilos ni scripts en línea ni `innerHTML` con datos.
- Capacidades de Tauri mínimas: solo los comandos propios, `core:event` y `core:window` para ocultar. Sin acceso a archivos ni shell desde la interfaz.
- La IA la llama Rust, no la página; la clave nunca vuelve entera a la interfaz. En Unix la base de datos queda con permisos 0600.
- Patrones a ignorar por defecto: tarjetas (13-19 dígitos con o sin espacios), tokens tipo `ghp_…`, `sk-…`, `AKIA…`, `xox…-`.
- La bóveda guarda solo texto cifrado; la clave derivada vive en memoria mientras está abierta y se borra al bloquear (`zeroize`).
- Licencia: cadena `VITA1.<datos base64url>.<firma base64url>`; datos `{"n": nombre, "e": email, "p": "pro", "i": "AAAA-MM-DD", "x": null|"AAAA-MM-DD"}`.
  Rust comprueba la firma con la clave pública incrustada. Las funciones Pro se comprueban **en Rust**, no solo en la interfaz.

### Errores
- Portapapeles no disponible (Wayland sin portal, otra app lo bloquea): el vigía reintenta con espera creciente hasta 5 s y no tumba la app.
- Atajo ocupado: `ajustes_guardar` devuelve «Ese atajo ya lo usa otra aplicación» y mantiene el anterior.
- IA: tiempo máximo de 60 s; errores 401/429/red traducidos a mensajes claros.

### Pruebas
- Rust: `cargo test` (db en memoria, licencias válidas/manipuladas/caducadas, bóveda ida y vuelta y contraseña errónea, ia con servidor falso, recorte del historial).
- JS: `node --test tests/` para todas las herramientas puras (transformar, calcular, generar, color, variables, buscar, acciones).
- CI en cada push (Linux): `cargo test`, `cargo clippy`, `node --test`, `node --check`.
- Prueba real en la Raspberry (Linux arm64, X11): compilar `.deb`, abrir con el atajo, copiar y pegar.

## 5. Fuera de esta versión (YAGNI, para más adelante)
OCR de imágenes, sincronización entre equipos, pasarela de pago y servidor de licencias, extensiones de terceros, firma de código
(Apple/Microsoft cobran; se documenta cómo abrir la app sin firmar).
