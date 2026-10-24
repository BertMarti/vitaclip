# Instalar Vitaclip

Descarga el archivo de tu sistema en **[Releases](https://github.com/BertMarti/vitaclip/releases/latest)**. Vitaclip no está firmado
(firmar cuesta dinero a Apple y Microsoft), así que tu sistema te avisará la primera vez. Es normal: aquí tienes cómo seguir.

Al abrirlo por primera vez verás los ajustes en la sección **Atajo**: pulsa la combinación que quieras para abrir Vitaclip.
Después la app vive en la **bandeja del sistema** (junto al reloj).

## Windows 10 y 11
1. Descarga `Vitaclip_x.y.z_x64-setup.exe` (o el `.msi`) y ábrelo.
2. Si aparece «Windows protegió su PC» (SmartScreen): pulsa **Más información → Ejecutar de todas formas**.
3. Termina el instalador. Vitaclip aparecerá en la bandeja; si no lo ves, mira en la flechita `^` junto al reloj.

## macOS
1. Descarga el `.dmg` de tu Mac: **aarch64** si tiene chip Apple (M1, M2…) o **x64** si es Intel.
2. Abre el `.dmg` y arrastra **Vitaclip** a **Aplicaciones**.
3. La primera vez, en Aplicaciones haz **clic derecho → Abrir → Abrir**. Si macOS dice que «está dañada», abre Terminal y ejecuta:
   ```bash
   xattr -cr /Applications/Vitaclip.app
   ```
4. **Permiso de Accesibilidad** (para que pueda pegar por ti): Ajustes del Sistema → Privacidad y seguridad → Accesibilidad →
   activa Vitaclip. Sin este permiso funciona igual, pero solo copia y tendrás que pegar tú con `⌘V`.
5. En Mac la app no sale en el Dock: búscala en la barra de menús.

## Linux
| Formato | Cómo instalar |
|---|---|
| `.deb` (Debian, Ubuntu, Mint, Raspberry Pi OS) | `sudo apt install ./Vitaclip_*.deb` |
| `.rpm` (Fedora, openSUSE) | `sudo dnf install ./Vitaclip-*.rpm` |
| `.AppImage` (cualquiera) | `chmod +x Vitaclip_*.AppImage` y ábrelo |

Elige `amd64`/`x86_64` para PC y `arm64`/`aarch64` para Raspberry Pi 5 u otros ARM.

### X11 y Wayland
- En **X11** funciona todo: el atajo global y el pegado automático.
- En **Wayland** (GNOME y KDE modernos, Raspberry Pi OS reciente…) el sistema no deja que las apps capturen atajos globales ni simulen
  teclas. La solución es fácil: crea **en los ajustes de teclado de tu sistema** un atajo que ejecute:
  ```bash
  vitaclip --mostrar
  ```
  Si el pegado automático no funciona, Vitaclip deja el texto copiado y te avisa: pega con `Ctrl+V`.
- En **GNOME** el icono de la bandeja necesita la extensión *AppIndicator and KStatusNotifierItem Support*.

## Arrancar con el sistema
Ajustes → General → **Arrancar con el sistema**.

## Desinstalar
- **Windows:** Configuración → Aplicaciones → Vitaclip → Desinstalar.
- **macOS:** arrastra `Vitaclip.app` de Aplicaciones a la papelera.
- **Linux:** `sudo apt remove vitaclip` (o `sudo dnf remove vitaclip`), o borra el `.AppImage`.

Tus datos (historial, fragmentos, ajustes y bóveda cifrada) quedan en tu carpeta de usuario por si vuelves. Bórrala si quieres eliminarlos:

| Sistema | Carpeta de datos |
|---|---|
| Windows | `%APPDATA%\com.bertmarti.vitaclip` |
| macOS | `~/Library/Application Support/com.bertmarti.vitaclip` |
| Linux | `~/.local/share/com.bertmarti.vitaclip` |
