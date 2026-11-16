# Política de privacidad de Vitaclip

Última actualización: 16 de noviembre de 2026

**Responsable:** BertMarti (https://github.com/BertMarti)  
**Contacto:** para cualquier duda sobre esta política, abre una incidencia en https://github.com/BertMarti/vitaclip/issues

Vitaclip es una aplicación de portapapeles, capturas de pantalla y grabación de vídeo diseñada con la privacidad como principio básico. No tiene cuentas, ni telemetría, ni anuncios, ni analítica. No recopila, vende ni comparte datos personales con nadie.

### Qué se guarda y dónde
- **Historial, fragmentos y ajustes:** se guardan exclusivamente en tu equipo, en una base de datos SQLite dentro de tu carpeta de usuario.
- **Capturas y vídeos:** se guardan únicamente en tu equipo, en la carpeta que elijas.
- **Bóveda:** los elementos almacenados en la bóveda van cifrados con tu contraseña maestra.
- **Desinstalación:** en la versión de Microsoft Store, todos los datos se borran automáticamente al desinstalar la aplicación.

### Lo que no se guarda
- Contenido protegido: lo que los gestores de contraseñas (KeePassXC, 1Password, Bitwarden, etc.) marcan como secreto no entra en el historial.
- Filtros por defecto: no se guardan números de tarjeta ni cadenas con apariencia de token o clave secreta.
- Control del usuario: puedes pausar la captura del portapapeles en cualquier momento desde la bandeja y configurar el borrado automático de elementos antiguos.

### Micrófono y sonido del equipo
Vitaclip solo accede al sonido mientras grabas un vídeo y solo si lo activas en Ajustes (el micrófono viene apagado por defecto; el sonido del equipo, encendido). El audio se almacena únicamente dentro del archivo de vídeo generado en tu equipo.

### Conexiones a Internet
Vitaclip no se conecta a Internet, con dos únicas excepciones opcionales:
1. **Actualizaciones:**
   - En la versión descargada de GitHub, pregunta una vez al día a GitHub si hay una versión nueva, sin enviar datos personales (GitHub ve tu dirección IP como en cualquier visita a una web). Puedes desactivar esta comprobación en Ajustes.
   - En la versión de Microsoft Store, las actualizaciones las gestiona la propia Store según la [política de privacidad de Microsoft](https://privacy.microsoft.com/).
2. **Funciones de IA:** solo si la configuras con tu propia clave y proveedor, y exclusivamente con el texto que pidas procesar. Ese texto lo trata dicho proveedor según su propia política de privacidad. La clave se guarda en el llavero del sistema.

### Menores
Vitaclip no recoge datos de nadie y, por tanto, tampoco recopila datos de menores.

### Cambios en esta política
Cualquier cambio en esta política se publicará en este mismo archivo, cuyo historial completo puede consultarse en el repositorio de GitHub.

---

## English

# Vitaclip Privacy Policy

Last updated: November 16, 2026

**Responsible party:** BertMarti (https://github.com/BertMarti)  
**Contact:** for any questions regarding this policy, please open an issue at https://github.com/BertMarti/vitaclip/issues

Vitaclip is a clipboard manager, screenshot, and screen recording tool designed with privacy as a foundational principle. It has no user accounts, telemetry, advertisements, or analytics. It does not collect, sell, or share personal data.

### What is stored and where
- **History, snippets, and settings:** stored exclusively on your device in an SQLite database inside your user folder.
- **Screenshots and videos:** saved solely on your device in the folder you select.
- **Vault:** items stored in the vault are encrypted with your master password.
- **Uninstallation:** in the Microsoft Store version, all data is automatically deleted when uninstalling the application.

### What is not stored
- Protected content: items marked as secret by password managers (such as KeePassXC, 1Password, Bitwarden, etc.) are never saved to history.
- Default filters: credit card numbers and text patterns resembling tokens or API keys are ignored by default.
- User control: clipboard capture can be paused at any time from the system tray, and automatic cleanup of older items can be configured.

### Microphone and system audio
Vitaclip only captures audio while recording a video and only if enabled in Settings (microphone is disabled by default; system audio is enabled by default). Audio is stored solely within the resulting video file on your device.

### Internet connections
Vitaclip does not connect to the Internet, with only two optional exceptions:
1. **Updates:**
   - In the version downloaded from GitHub, it queries GitHub once a day to check for new releases without sending personal data (GitHub sees your IP address as with any standard web request). This check can be turned off in Settings.
   - In the Microsoft Store version, updates are managed by Microsoft Store under the [Microsoft Privacy Statement](https://privacy.microsoft.com/).
2. **AI features:** only if configured with your own provider and API key, and strictly limited to the text you choose to process. That text is handled by the respective provider according to its own privacy policy. Your API key is stored in your system keyring.

### Minors
Vitaclip collects no data from anyone, and therefore collects no data from minors.

### Changes to this policy
Any future revisions to this policy will be published in this file, and its complete revision history is publicly viewable on GitHub.
