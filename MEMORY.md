# MEMORY.md

Decisiones y medidas del proyecto. Lo más reciente, arriba en cada sección.

## Decisiones (2026-10-24)
- **Nombre:** Vitaclip (clip + vitamina), «el portapapeles supervitaminado». Repo público `BertMarti/vitaclip`.
- **Tauri v2 y no Electron:** instaladores de ~10 MB en lugar de ~100 MB, atajos globales y bandeja oficiales, compilación gratis en
  GitHub Actions para Windows, macOS (Intel y Apple Silicon) y Linux (x64 y arm64). Se descartó Tauri 3 (aún en alfa).
- **Interfaz sin paso de build** (como ARIA): módulos ES nativos, CSP estricta, `el()` + `textContent`.
- **Atajo elegido por el usuario (Alberto, 24/10):** no se impone ninguno; Ctrl+Shift+Ñ era solo un ejemplo. La primera vez se abren los
  ajustes en «Atajo» para grabarlo; mientras tanto vale la sugerencia `CommandOrControl+Alt+KeyV` (Ctrl+Alt+V / Cmd+Option+V), elegida
  porque no choca con atajos habituales (Ctrl+Shift+V es «pegar sin formato» en navegadores y terminales). Se guardan por tecla física
  (`event.code`), así funcionan con cualquier distribución de teclado. Alternativa para Wayland: atajo del sistema → `vitaclip --mostrar`.
- **Portapapeles con `arboard` y sondeo cada 400 ms:** no hay evento común en los 3 sistemas. Un único `Clipboard` vive en el estado
  porque en X11 lo copiado desaparece al soltar el objeto.
- **Pegar con `enigo`** simulando Ctrl/Cmd+V tras ocultar el popup (120 ms). En Wayland puede fallar: queda copiado y se avisa.
  En Wayland tampoco funcionan los atajos globales de X11: se documenta crear un atajo del sistema que ejecute `vitaclip --mostrar`
  (el plugin de instancia única lo reenvía a la app abierta).
- **Modelo gratis + Pro sin pasarela:** licencia `VITA1.<datos>.<firma>` Ed25519 comprobada sin conexión, igual que ARIA Premium.
  Clave privada en `~/homelab/.claves-vitaclip/privada.pem` (0600, fuera del repo). La licencia de Alberto (perpetua) está en
  `~/homelab/.claves-vitaclip/licencia-alberto.txt`. Emitir: `node scripts/licencia.mjs emitir --nombre N --email E`.
- **Licencia del código: Elastic License 2.0** (como ARIA): código visible y modificable, pero no se puede quitar la comprobación de
  licencia ni ofrecerlo como servicio. Es «gratis» para usar; quien compile y parchee se salta el Pro (se asume, como en todo open core).
- **Funciones Pro comprobadas en Rust** (`Estado::exigir_pro`), no solo en la interfaz.
- **Bóveda:** Argon2id (19 MiB, 2 pasadas, OWASP) + XChaCha20-Poly1305 por secreto; autobloqueo a los 5 min sin uso; lo pegado desde
  la bóveda se marca (`huella_secreta`) para que el vigía no lo meta en el historial.
- **IA:** cualquier API compatible con OpenAI (Ollama local, Groq, Gemini, OpenRouter, OpenAI); la llama Rust, la clave se guarda en
  la base de datos local (0600 en Unix) y nunca vuelve entera a la interfaz.
- **Exportar** escribe en Descargas (sin plugin de diálogos); **importar** usa `<input type=file>` + `FileReader`.
- Fuera de la v0.1: OCR, sincronización, pasarela de pago, firma de código (Apple/Microsoft cobran).

## Entorno
- Desarrollo en la Raspberry Pi 5 (Debian 13 arm64, X11): Rust 1.99 con rustup, WebKitGTK 4.1 (2.54), Node 20.
- Los delegados de OpenCode usan el perfil `delegado` de `opencode.json` (en este repo), que les deja ejecutar `cargo` y `node --test`.
  Para no recompilar todo en cada worktree se lanzan con `CARGO_TARGET_DIR` apuntando al `target` del repo principal.
