# Instalar Vitaclip

Descarga la versión para tu sistema desde **[Releases](https://github.com/BertMarti/vitaclip/releases/latest)**.

### Comprobar que la descarga es auténtica (opcional)
Cada versión trae `SHA256SUMS.txt` con la huella de todos los instaladores y una atestación de GitHub que demuestra que se
compilaron en este repositorio:
```bash
sha256sum -c SHA256SUMS.txt --ignore-missing
gh attestation verify Vitaclip_x.y.z_x64-setup.exe -R BertMarti/vitaclip
```

## Windows 10 y 11
1. Descarga `Vitaclip_x.y.z_x64-setup.exe` y ejecútalo.
2. Si Windows muestra el aviso de SmartScreen («Windows protegió su PC»), pulsa en **Más información → Ejecutar de todas formas**.
   No significa que sea un virus: avisa porque aún no está firmado ([más información](FIRMA.md)).
   El instalador es **para tu usuario**: no pide permisos de administrador.
3. Al finalizar, Vitaclip aparecerá en la bandeja del sistema (junto al reloj).

## macOS
1. Descarga el archivo según tu procesador: **aarch64** (Apple Silicon M1, M2...) o **x64** (Intel).
2. Abre el `.dmg` y arrastra **Vitaclip** a la carpeta **Aplicaciones**.
3. La primera vez, macOS la bloquea porque no está firmada por Apple:
   - **macOS 15 (Sequoia) o posterior:** ábrela una vez (saldrá el aviso), ve a **Ajustes del Sistema → Privacidad y seguridad**, baja
     hasta «Se ha bloqueado Vitaclip» y pulsa **Abrir igualmente**.
   - **macOS 14 o anterior:** **clic derecho → Abrir → Abrir**.
   - Si macOS dice que «está dañada», ejecuta en Terminal:
   ```bash
   xattr -cr /Applications/Vitaclip.app
   ```
4. **Permisos necesarios:**
   - **Accesibilidad:** Ajustes del Sistema → Privacidad y seguridad → Accesibilidad. Activa Vitaclip para permitir el pegado automático.
   - **Grabación de pantalla:** Ajustes del Sistema → Privacidad y seguridad → Grabación de pantalla. Activa Vitaclip para poder realizar capturas y grabaciones.
   - Como la app no tiene una firma de Apple estable, **al actualizar** macOS puede volver a pedir estos permisos: quita Vitaclip de
     la lista y vuelve a añadirlo si dejan de funcionar.

## Linux
Instala el paquete correspondiente a tu distribución:
- **Debian/Ubuntu:** `sudo apt install ./Vitaclip_*.deb`. Requiere la dependencia `libpipewire-0.3`.
- **Fedora/SUSE:** `sudo dnf install ./Vitaclip-*.rpm`.
- **AppImage:** dale permisos de ejecución (`chmod +x`) y ábrelo. La orden `vitaclip` no existe con la AppImage: en los atajos del
  sistema usa la ruta completa, por ejemplo `~/Aplicaciones/Vitaclip_x.y.z_amd64.AppImage --mostrar`.

### X11 y Wayland
- En **X11**, los atajos globales y el pegado automático funcionan directamente.
- En **Wayland**, el sistema bloquea los atajos globales. Debes crear atajos manuales en los ajustes de teclado de tu sistema que apunten a:
  - `vitaclip --mostrar`
  - `vitaclip --captura`
  - `vitaclip --video`
  La grabación de vídeo en Wayland mostrará un diálogo del sistema para que elijas qué pantalla compartir (vía PipeWire / xdg-desktop-portal).
- En **GNOME**, el icono de la bandeja necesita la extensión *AppIndicator and KStatusNotifierItem Support*.

---

## Carpetas de archivos y datos

Por defecto, Vitaclip guarda tus capturas y vídeos en:
- **Capturas:** `Imágenes/Vitaclip`
- **Vídeos:** `Vídeos/Vitaclip`

Los datos de la aplicación (historial, ajustes, fragmentos) se guardan en:

| Sistema | Ruta de datos |
|---|---|
| Windows | `%LOCALAPPDATA%\com.bertmarti.vitaclip` |
| macOS | `~/Library/Application Support/com.bertmarti.vitaclip` |
| Linux | `~/.local/share/com.bertmarti.vitaclip` |

## Desinstalar
- **Windows:** Configuración → Aplicaciones → Vitaclip → Desinstalar.
- **macOS:** arrastra `Vitaclip.app` de Aplicaciones a la papelera.
- **Linux:** `sudo apt remove vitaclip` (o `sudo dnf remove vitaclip`), o borra el `.AppImage`.

Tus datos se quedan en las carpetas de arriba por si vuelves; bórralas si quieres eliminarlos.
