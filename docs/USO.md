# Guía de uso de Vitaclip

## Los atajos
Vitaclip utiliza tres atajos principales que puedes configurar en **Ajustes → Atajos**. Haz clic en cada campo y **pulsa la combinación que prefieras**.

Sugerencias de uso:
- **Abrir Vitaclip:** `Ctrl+Alt+V` (o `⌘⌥V` en Mac). Muestra el historial y fragmentos.
- **Captura de pantalla:** `Ctrl+Alt+C`. Activa el selector para capturar una zona.
- **Grabación de vídeo:** `Ctrl+Alt+R`. Activa el selector para grabar vídeo.

Si quieres desactivar un atajo, pulsa el botón **Desactivar**. Si otra aplicación ya usa una combinación, Vitaclip te avisará.

### Usuarios de Linux (Wayland)
Si tu sistema no permite que Vitaclip registre los atajos, crea atajos de teclado en la configuración de tu sistema que ejecuten estas órdenes:
- `vitaclip --mostrar`
- `vitaclip --captura`
- `vitaclip --video`

---

## La ventana
La ventana de Vitaclip es compacta y flexible:
- **Mover:** arrastra desde la cabecera o desde el pie de la ventana.
- **Redimensionar:** usa el asa de la esquina inferior derecha.
- **Modos de posición (Ajustes → General):**
  - **Junto al ratón:** la ventana aparece donde esté el puntero.
  - **Recordar posición:** se abre siempre en el mismo sitio y con el tamaño que elegiste.

---

## Historial y búsqueda
Todo lo que copias entra arriba de la lista. Las entradas **fijadas** no se borran nunca automáticamente.

**Buscar:** escribe para filtrar. Prefijos útiles:
- `img:` solo imágenes.
- `url:` solo enlaces web.
- `fij:` solo elementos fijados.

**Teclado:**
- `↑` `↓`: navegar por la lista.
- `Enter`: pegar el elemento seleccionado.
- `Ctrl+1…9`: pegar rápidamente uno de los primeros 9 elementos.
- `Ctrl+P`: fijar o soltar el elemento.
- `Supr`: borrar elemento (o `Shift+Supr` mientras buscas).
- `→` o `Tab`: abrir el panel de detalle y transformaciones.
- `←` o `Esc`: volver a la lista desde el detalle.
- `Alt+1…4`: cambiar entre pestañas (Historial, Fragmentos, Capturas, Bóveda).
- `Esc`: limpiar búsqueda o cerrar la ventana.

---

## Detalle y transformaciones
Al abrir el detalle (`→` o `Tab`), verás el contenido completo y opciones para transformarlo:
- **Transformar:** MAYÚSCULAS, minúsculas, quitar tildes, JSON bonito, Base64, etc. Elige una y pulsa `Enter` para pegarla directamente.
- **Calculadora:** escribe una operación que empiece por `=` en el buscador (ej: `=21*1,21` o `=200*15%`) y el resultado aparecerá arriba.

---

## Fragmentos y variables
Los fragmentos son textos que usas a menudo. Puedes crearlos en su pestaña y usar variables que se rellenan solas al pegar:
- `{fecha}`, `{hora}`, `{fecha_hora}`.
- `{portapapeles}`: inserta lo último que copiaste.
- `{uuid}`: genera un identificador único.
- `{cursor}`: sitúa el cursor ahí tras pegar.
- `{campo:Nombre}`: te pide que escribas un valor antes de pegar.

---

## Captura de pantalla
Al pulsar el atajo de captura (o en la pestaña **Capturas**):
1. **Selecciona la zona:** haz clic y arrastra. Puedes mover la selección con las flechas del teclado o ajustarla con las asas.
2. **Dibuja:** usa las herramientas de la barra (lápiz, línea, flecha, rectángulo, marcador, texto).
3. **Colores:** cambia el color y el grosor del trazo.
4. **Acciones:**
   - `Enter` o `Ctrl+C`: copia la captura al historial.
   - `Ctrl+S`: guarda como PNG en `Imágenes/Vitaclip`.
   - `Ctrl+Z`: deshacer último trazo.
   - `Esc`: cancelar.

---

## Grabación de vídeo
Usa el mismo selector de zona:
- **Grabar zona:** ajusta el área y pulsa `Enter`.
- **Pantalla completa:** pulsa `F`.
- **Durante la grabación:** verás un indicador con el tiempo transcurrido. Para detener, pulsa el botón **Detener** o usa de nuevo el atajo de vídeo.
- **Resultado:** se guarda un vídeo **MP4 (H.264)** en `Vídeos/Vitaclip` (o la carpeta que elijas).
- **Ajustes:** puedes elegir entre 30 o 60 fps y calidad Alta o Máxima. (Nota: en esta versión no se graba sonido).

---

## Bóveda y IA
- **Bóveda:** guarda datos cifrados con una contraseña maestra. Lo que pegues desde aquí no entra en ningún historial (tampoco en
  el de Windows) y se borra del portapapeles a los 30 segundos.
- **IA:** utiliza modelos para procesar textos. Puedes usar **Ollama** (gratis y local), o servicios como **Groq** y **Gemini** con
  sus claves gratuitas. Encima de los botones verás adónde se envía el texto. La clave se guarda en el llavero del sistema
  (Llavero de macOS, Administrador de credenciales de Windows, Secret Service en Linux), solo viaja por https (o a tu propio
  equipo) y, si cambias de proveedor, tendrás que volver a escribirla.

---

## Ajustes y mantenimiento
- **Borrar lo antiguo (Ajustes → General):** elige si se borra lo que lleve una semana, un mes, tres meses o un año sin usarse. Lo
  fijado se queda siempre.
- **Contraseñas:** lo que copias desde gestores de contraseñas como KeePassXC, 1Password o Bitwarden no se guarda.
- **Carpetas:** en **Ajustes → Capturas y vídeo** eliges dónde se guardan las capturas y los vídeos (**Elegir…**) y las abres (**Abrir**). Desde la pestaña **Capturas** del popup también puedes abrirlas y ver lo último que has guardado.
- **Importar/Exportar (Ajustes → Privacidad):** guarda tu historial de textos y tus fragmentos en un archivo JSON (en Descargas) para llevarlos a otro equipo. No incluye imágenes, ajustes ni la bóveda.

---

## Preguntas frecuentes

**El atajo no funciona.**
Comprueba que otra aplicación no esté usando la misma combinación. En Linux con X11 usa letras, números o F1-F12 (las teclas como la Ñ o la º no se pueden registrar); con Wayland, crea los atajos en tu sistema con las órdenes de arriba.

**Permisos en macOS.**
Para que Vitaclip funcione correctamente, debes conceder permisos en:
- *Ajustes del Sistema → Privacidad y seguridad → Accesibilidad* (para pegar automáticamente).
- *Ajustes del Sistema → Privacidad y seguridad → Grabación de pantalla* (para las capturas y vídeos).

**¿Mis datos están seguros?**
Sí. Todo se guarda localmente en tu equipo. Si usas la IA, solo el texto que envíes específicamente para procesar llegará al proveedor que hayas configurado.
