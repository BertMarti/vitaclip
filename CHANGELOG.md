# Historial de versiones

## [1.0.1] - 2026-11-02

### Cambiado
- Primera versión que llega sola por el actualizador: quien tenga la 1.0.0 la recibe con «Actualizar y reiniciar».
- Publicación más robusta: el archivo que consulta el actualizador se genera en un único paso, cuando ya están todos los instaladores.

## [1.0.0] - 2026-11-02

### Añadido
- **Actualizaciones automáticas:** Vitaclip comprueba una vez al día si hay versión nueva y se actualiza con un clic. Las descargas van firmadas digitalmente para mayor seguridad.
- **Herramientas de captura:** nuevas herramientas **Pixelar** (para tapar datos sensibles) y **Numerar** (círculos con números para guías y pasos).
- **Editar antes de pegar:** permite modificar un texto en el panel de detalle antes de pegarlo, sin alterar el original del historial.
- **Pegar varios:** selección múltiple en el historial (Shift o Ctrl/Cmd) para pegar varios textos de una sola vez.

### Cambiado
- Mejora en la gestión de la privacidad: se detalla la conexión única a GitHub para buscar actualizaciones (desactivable).

## [0.3.2] - 2026-10-28

### Añadido
- Vitaclip se inicia sola al encender el equipo (activado por defecto; se quita en Ajustes → General o en el Administrador de tareas de Windows).

## [0.3.1] - 2026-10-26

### Añadido
- Nuevo icono de la aplicación.
- Instaladores personalizados con imagen propia; en Windows se instala solo para tu usuario, sin permisos de administrador.

## [0.3.0] - 2026-10-26

### Cambiado
- Revisión completa de seguridad: implementación de capacidades de Tauri para cada ventana.
- Uso del llavero del sistema para guardar claves de IA de forma segura.
- Mejora en el borrado de datos con limpieza segura de la base de datos.

## [0.2.0] - 2026-10-25

### Añadido
- **Capturas de pantalla:** selector de zona con herramientas de dibujo (lápiz, flecha, texto, etc.).
- **Grabación de vídeo:** grabación de zona o pantalla completa en MP4 de alta calidad.
- Atajos independientes para captura y vídeo.

### Cambiado
- **Todo gratis:** Vitaclip pasa a ser totalmente gratuita bajo licencia MIT; se eliminan las restricciones y funciones "Pro".

## [0.1.0] - 2026-10-24

### Añadido
- Primera versión pública.
- Historial de textos e imágenes con búsqueda instantánea.
- Fragmentos de texto con variables dinámicas.
- Transformaciones de texto y calculadora integrada.
- Bóveda cifrada para datos sensibles.
- Integración opcional con IA (Ollama, Groq, Gemini).
