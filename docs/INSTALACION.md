# Instalar Vitaclip

Descarga la versión para tu sistema desde **[Releases](https://github.com/BertMarti/vitaclip/releases/latest)**.

## Windows 10 y 11
1. Descarga `Vitaclip_x.y.z_x64-setup.exe` y ejecútalo.
2. Si Windows muestra el aviso de SmartScreen, pulsa en **Más información → Ejecutar de todas formas**.
3. Al finalizar, Vitaclip aparecerá en la bandeja del sistema (junto al reloj).

## macOS
1. Descarga el archivo según tu procesador: **aarch64** (Apple Silicon M1, M2...) o **x64** (Intel).
2. Abre el `.dmg` y arrastra **Vitaclip** a la carpeta **Aplicaciones**.
3. La primera vez, haz **clic derecho → Abrir** sobre la aplicación.
4. **Permisos necesarios:**
   - **Accesibilidad:** Ajustes del Sistema → Privacidad y seguridad → Accesibilidad. Activa Vitaclip para permitir el pegado automático.
   - **Grabación de pantalla:** Ajustes del Sistema → Privacidad y seguridad → Grabación de pantalla. Activa Vitaclip para poder realizar capturas y grabaciones.

## Linux
Instala el paquete correspondiente a tu distribución:
- **Debian/Ubuntu:** `sudo apt install ./Vitaclip_*.deb`. Requiere la dependencia `libpipewire-0.3`.
- **Fedora/SUSE:** `sudo dnf install ./Vitaclip-*.rpm`.
- **AppImage:** dale permisos de ejecución (`chmod +x`) y ábrelo.

### X11 y Wayland
- En **X11**, los atajos globales y el pegado automático funcionan directamente.
- En **Wayland**, el sistema bloquea los atajos globales. Debes crear atajos manuales en los ajustes de teclado de tu sistema que apunten a:
  - `vitaclip --mostrar`
  - `vitaclip --captura`
  - `vitaclip --video`
  La grabación de vídeo en Wayland mostrará un diálogo del sistema para que elijas qué pantalla compartir (vía PipeWire / xdg-desktop-portal).

---

## Carpetas de archivos y datos

Por defecto, Vitaclip guarda tus capturas y vídeos en:
- **Capturas:** `Imágenes/Vitaclip`
- **Vídeos:** `Vídeos/Vitaclip`

Los datos de la aplicación (historial, ajustes, fragmentos) se guardan en:

| Sistema | Ruta de datos |
|---|---|
| Windows | `%APPDATA%\com.bertmarti.vitaclip` |
| macOS | `~/Library/Application Support/com.bertmarti.vitaclip` |
| Linux | `~/.local/share/com.bertmarti.vitaclip` |
