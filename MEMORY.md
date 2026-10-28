# MEMORY.md

Decisiones y medidas del proyecto. Lo más reciente, arriba en cada sección.

## Versión 0.2 (2026-10-25)
- **Todo gratis y MIT (Alberto, 25/10):** se quitan la licencia Ed25519, el Pro, `scripts/licencia.mjs` y la Elastic License. Las
  decisiones de licencias de abajo quedan solo como historia. Las claves de `~/homelab/.claves-vitaclip/` ya no se usan.
- **Capturas y vídeo con `xcap` 0.9.8 + `openh264` 0.9 + `muxide` 0.5** (todo en Rust, sin ffmpeg): comprobado en la Pi. Capturar en
  Wayland 276 ms, en X11 23 ms. openh264: `UsageType::ScreenContentRealTime` (el NonRealTime falla la validación) y sin `Profile::High`.
  En la Pi la codificación no llega al tiempo real (≈6 fps a 1600×900): la cola descarta fotogramas; un PC va a 30-60 fps.
- **Grabar en Wayland** necesita el selector del portal (xdg-desktop-portal); la Pi no tiene ninguno y falla con «Sources not selected».
  Para probar: Xvfb + xdotool (ver SKILLS.md).
- **Ventana compacta** 380×480 (mínimo 300×320), junto al ratón o en la posición recordada; tamaño guardado en píxeles LÓGICOS. En
  Wayland las apps no pueden colocar sus ventanas: allí la pone el compositor.
- **Crear ventanas desde comandos síncronos bloquea Tauri en Windows**: los comandos que crean ventanas son `async` o usan hilos.
- **Linux se compila en Ubuntu 24.04** (x64 y arm64): el PipeWire de la 22.04 (0.3.48) es demasiado viejo para `pipewire` 0.10 de
  xcap. Consecuencia: los .deb/.AppImage piden glibc 2.39 (Ubuntu 24.04+, Debian 13+).
- **En Windows `xcap::Monitor` no es `Send`**: al hilo de grabación se le pasan las coordenadas y busca el monitor allí. Este tipo de
  error solo sale compilando para Windows: lanza `prueba-windows.yml` antes de publicar.
- **Seguridad (0.2.2, tras la revisión de la sesión «Revisión de repositorios GitHub», informe en
  `~/homelab/.wt/mejoras-informes/revision-vitaclip.md`):** (A1) `sensible.rs` lee las marcas «no guardar» de los gestores de
  contraseñas (Windows: ExcludeClipboardContentFromMonitorProcessing / CanIncludeInClipboardHistory=0; macOS: nspasteboard
  Concealed/Transient; Linux: x-kde-passwordManagerHint por wl-clipboard-rs o TARGETS de X11) y el vigía no guarda ese contenido;
  verificado en X11 y en el Wayland de la Pi. (A2) Lo pegado desde la bóveda va con `exclude_from_*` de arboard y se borra a los
  30 s. (M1) La clave de IA solo se conserva si la URL no cambia y solo viaja por https o a localhost. (M3) Un recorte de vídeo
  que no cabe aborta la grabación con aviso en vez de cerrar la app. El resto del informe se aplicó en la 0.3.0 (ver abajo).
- **0.3.0 (26/10): resto de la revisión.** M2 clave de IA en el llavero (`keyring` 3; en la Pi va a gnome-keyring, comprobado con
  `secret-tool`; migración al arrancar). M4 `secure_delete` + checkpoint TRUNCATE + VACUUM al vaciar. M5 carpeta 0700, base y
  -wal/-shm 0600 (comprobado); Windows en `%LOCALAPPDATA%` con migración desde Roaming. M6 acciones fijadas por SHA, `--locked`,
  firma ad hoc en macOS, `SHA256SUMS.txt` + `attest-build-provenance`. B1 las carpetas solo con el diálogo (vaciar sí). B2 imágenes
  > 64 MiB en crudo se saltan y retención por días. Bajos: capacidades por ventana (prueba en `tests/capacidades.test.js`), CSP de
  los HTML con `connect-src ipc:`, `create_new` para archivos nuevos, importar sin sobrescribir, `clip` por id, errores de archivos en
  español, `cargo deny` en el CI (excepción glib justificada en `deny.toml`). Uso: botón del repositorio, macOS 15, AppImage,
  combobox accesible, destino de la IA y contador de cambios del portapapeles (Windows/macOS).
- **Mover y redimensionar en Windows (0.2.1):** al empezar un arrastre (`start_dragging`/`start_resize_dragging`) Windows le quita
  el foco a la ventana y el popup, que se oculta al perder el foco, se cerraba y cortaba el movimiento. Ahora lo inicia Rust
  (`ventana_arrastrar`), ignora `Focused(false)` mientras el botón izquierdo siga pulsado (`GetAsyncKeyState`) y devuelve el foco
  al soltar. Verificado con `prueba-ventana-windows.ps1` (ratón simulado; medir con GetClientRect, no GetWindowRect, que incluye
  bordes invisibles; la pantalla del runner es de 1024×768).
- Quitadas la pestaña Herramientas, los generadores y las acciones personalizadas (Alberto: «cosas inútiles»).
- Fallos encontrados al probar de verdad y arreglados: el popup se salía de la pantalla (`outer_size()` devuelve el tamaño viejo justo
  tras `set_size`), los nombres de archivo iban en UTC (ahora `chrono::Local`), y sin fila de ajustes no se guardaban ni la posición
  ni la pausa (ahora `db::ajustes()` con valores por defecto).

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

## Prueba real en la Raspberry Pi 5 (2026-10-25, Wayland labwc)
- **WebKitGTK pintaba basura** (bloques y rayas) con el renderizado DMABUF de la GPU de la Pi. Solución en `main.rs`: en Linux se pone
  `WEBKIT_DISABLE_DMABUF_RENDERER=1` si el usuario no lo ha definido. Con eso se ve perfecto.
- Funciona: bienvenida de ajustes en «Atajo» la primera vez, captura con `wl-copy` (5/5 textos; el token `ghp_…` se ignoró),
  `vitaclip --mostrar` desde una segunda instancia abre el popup en la que ya corre, calculadora `=21*1,21` + Enter deja `25,41` copiado.
- Lo que la app pega por sí misma (huella propia) no se añade como entrada nueva: solo sube si ya existía.
- En Wayland el atajo global de la app no llega (el sistema no lo permite): se usa un atajo del sistema con `vitaclip --mostrar`.

## Atajo que no saltaba en Windows (2026-10-25)
- **Causa real** (reproducida en un Windows de GitHub Actions con `prueba-windows.yml`): `global-hotkey` convierte la tecla física en
  la tecla virtual de un teclado ESTADOUNIDENSE (Semicolon → `VK_OEM_1`), pero con teclado español la Ñ envía `VK_OEM_3` (0xC0).
  `Ctrl+Shift+Ñ`: 0/3 antes, 3/3 después. `Ctrl+Alt+V` funcionaba siempre (3/3), así que la hipótesis del foco quedó descartada.
- **Arreglo:** `teclado.rs` traduce con `MapVirtualKeyW` (código de exploración → tecla virtual de la distribución activa) y elige el
  `Code` que `global-hotkey` convierte en esa tecla virtual. Todo atajo debe pasar por `teclado::adaptar` antes de registrarse.
- En Linux X11 `global-hotkey` usa keysyms: teclas como la Ñ no se pueden registrar; usar letras, números o F1-F12.

## Empaquetado y firma (2026-10-26, v0.3.1)
- **El aviso de Windows es SmartScreen, no un virus:** Defender (firmas del 26/10) no encontró nada en el `.exe` ni en el `.msi`
  (`prueba-windows.yml` los analiza en cada pasada). Solo se quita con firma Authenticode + reputación. Un certificado autofirmado no
  sirve.
- **Firma gratuita con SignPath Foundation:** `release.yml` firma `.exe` y `.msi` solo si existe la variable
  `SIGNPATH_ORGANIZATION_ID` (y el secret `SIGNPATH_API_TOKEN`); sin ellas publica sin firmar. La solicitud (signpath.org/apply) la
  tiene que hacer Alberto: ver `docs/FIRMA.md`.
- **Iconos:** fuentes en `src-tauri/iconos-fuente/` (`icono.svg` grande, `icono-pequeno.svg` para 16-32 px, bandeja a color y
  plantilla negra para macOS). `icon.ico` se arma con Pillow usando la variante pequeña hasta 32 px. Imágenes de los instaladores:
  `scripts/imagenes-instalador.py`.
- **Instaladores:** NSIS por usuario (`%LOCALAPPDATA%\Vitaclip`, sin administrador), MSI en es-ES y en-US, dmg con fondo. El job
  `instalador` de `prueba-windows.yml` lo instala de verdad y saca capturas del asistente.

## Arranque con el sistema (2026-10-28, v0.3.2)
- **Activado por defecto** y activado una vez al actualizar (clave `arranque` en la tabla de ajustes). Después manda el sistema: si el
  usuario lo quita en el Administrador de tareas o borra la entrada, el ajuste se apaga y no se vuelve a poner (probado en Windows
  real y en la Pi).
- **No usar `tauri-plugin-autostart`:** con la app como administrador escribía en HKLM (todo el equipo) y ponía la ruta sin comillas,
  que falla con espacios. `arranque.rs` usa `auto-launch` con `WindowsEnableMode::CurrentUser` y la ruta entre comillas.
- En Linux `auto-launch` escribe en `~/.config/autostart` aunque se cambie `XDG_CONFIG_HOME`: al probar, borrar la entrada después.
