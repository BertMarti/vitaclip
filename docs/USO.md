# Guía de uso de Vitaclip

## El atajo
Vitaclip no te impone ningún atajo. La primera vez se abren los ajustes en **Atajo**: haz clic en el campo y **pulsa la combinación que
quieras** (una tecla más al menos Ctrl/Cmd, Alt o Shift). Puedes cambiarlo cuando quieras en Ajustes → Atajo; **Restablecer** vuelve a la
sugerencia `Ctrl+Alt+V` (`⌘⌥V` en Mac). Los atajos se guardan por tecla física, así que funcionan con cualquier distribución de teclado.

Si otra aplicación ya usa esa combinación, Vitaclip te lo dice y conserva la anterior. En Wayland, o si prefieres que lo gestione tu
sistema, crea un atajo del sistema que ejecute `vitaclip --mostrar`.

## Historial
Todo lo que copias (texto e imágenes) entra arriba de la lista. Si copias algo que ya estaba, sube arriba en vez de duplicarse.
Sin Pro se guardan las últimas 300 entradas; las **fijadas** no se borran nunca solas.

**Buscar:** escribe y la lista se filtra al momento; todas las palabras tienen que aparecer, en cualquier orden.
Prefijos útiles:

| Prefijo | Muestra |
|---|---|
| `img:` | solo imágenes |
| `url:` | solo enlaces |
| `fij:` | solo fijados |

**Teclado:**

| Tecla | Acción |
|---|---|
| `↑` `↓` o `Ctrl+J` `Ctrl+K` | moverse |
| `Enter` | pegar el seleccionado |
| `Ctrl+1…9` | pegar el número indicado |
| `Ctrl+P` | fijar o soltar |
| `Supr` (o `Shift+Supr` mientras buscas) | borrar |
| `Tab` / `Shift+Tab` | entrar y salir del panel de herramientas |
| `Alt+1…4` | pestañas Historial, Fragmentos, Herramientas, Bóveda |
| `Ctrl+,` | ajustes |
| `Esc` | borrar la búsqueda; si está vacía, cerrar |

Al pegar, Vitaclip se oculta y pega en la aplicación donde estabas. Si el sistema no le deja simular el pegado (Mac sin permiso de
Accesibilidad, Wayland), lo deja copiado y te avisa: pega tú con `Ctrl+V` / `⌘V`.

## Panel de detalle
A la derecha ves el elemento completo, sus contadores (caracteres, palabras, líneas) y botones para **Pegar, Fijar, Borrar y QR**.
- **Colores:** si copias `#1e90ff`, `rgb(30,144,255)` o `hsl(210,100%,56%)`, verás la muestra y podrás pegarlo en HEX, RGB o HSL.
- **QR:** genera el código QR del texto (hasta 1500 caracteres), para pasarlo al móvil en un segundo.

## Transformaciones
Pulsa `Tab` en un elemento, elige con `↑` `↓` y `Enter`: se pega el resultado (el original no cambia).

MAYÚSCULAS · minúsculas · Tipo Título · Tipo oración · camelCase · snake_case · kebab-case · quitar espacios sobrantes · una sola línea ·
ordenar líneas · quitar líneas duplicadas · invertir · JSON bonito · JSON compacto · Base64 (codificar / decodificar) ·
URL (codificar / decodificar) · slug · quitar tildes · escapar / desescapar HTML.

## Calculadora
Escribe `=` y la operación en el buscador; el resultado sale como primera fila y `Enter` lo pega.

| Escribes | Resultado |
|---|---|
| `=21*1,21` | 25,41 |
| `=200*15%` | 30 |
| `=(3+4)^2/7` | 7 |
| `=2^3^2` | 512 |

Acepta `+ - * / ^`, paréntesis, porcentajes y decimales con coma o punto.

## Fragmentos
Textos que reutilizas (firmas, direcciones, respuestas tipo). En la pestaña **Fragmentos** crea uno con nombre, una abreviatura
(por ejemplo `firma`) y el contenido. Para pegarlo: búscalo o escribe `;firma` en el buscador.

Variables que se rellenan solas al pegar:

| Variable | Se convierte en |
|---|---|
| `{fecha}` | 24/10/2026 |
| `{hora}` | 21:30 |
| `{fecha_hora}` | 24/10/2026 21:30 |
| `{portapapeles}` | lo último que copiaste |
| `{uuid}` | un identificador único nuevo |
| `{cursor}` | se quita y marca dónde debería quedar el cursor |

Ejemplo: `Hola, te envío el informe del {fecha}. Un saludo.`

## Herramientas
- **Generadores:** UUID, contraseña segura (eliges la longitud), fecha ISO, marca de tiempo Unix y texto de relleno (lorem ipsum).
  `Enter` pega el resultado.
- **Calculadora rápida** (igual que con `=`).

## Ajustes
- **General:** idioma (español/inglés), tema (sistema, claro, oscuro), pegar automáticamente, arrancar con el sistema, pausar la captura y
  tamaño del historial.
- **Privacidad:** patrones que nunca se guardan (expresiones regulares). Vienen puestos los de tarjetas y tokens. Ejemplos para añadir:
  - `^ES\d{22}$`: IBAN españoles sin espacios.
  - `(?i)contraseña`: cualquier cosa que contenga la palabra «contraseña».

  También puedes **vaciar el historial**, **exportarlo** (se guarda un JSON en tu carpeta de Descargas) e **importarlo**.
- **Licencia:** pega tu licencia Pro y pulsa Activar.

---

## Funciones Pro

### IA en el portapapeles
En el panel de detalle: **Traducir, Resumir, Corregir, Más formal, Más cercano, Explicar código** y **Pedir…** (una orden libre, por
ejemplo «pásalo a una lista»). El resultado se puede pegar directamente.

Configúrala en Ajustes → IA eligiendo un proveedor:
- **Ollama (gratis y local, nada sale de tu equipo):** instala [Ollama](https://ollama.com), ejecuta `ollama pull llama3.2` y deja la URL
  `http://localhost:11434/v1` y el modelo `llama3.2`. No necesita clave.
- **Groq (capa gratuita):** crea una clave en [console.groq.com](https://console.groq.com/keys) y elige un modelo de su lista.
- **Gemini (capa gratuita):** crea una clave en [aistudio.google.com](https://aistudio.google.com/apikey) y usa un modelo Flash.
- También **OpenRouter**, **OpenAI** o cualquier API compatible con OpenAI («Personalizado»).

Pulsa **Probar** para comprobarlo. La clave se guarda solo en tu equipo y nunca se vuelve a mostrar entera.

### Bóveda cifrada
Para contraseñas, IBAN, claves… Crea una contraseña maestra (mínimo 8 caracteres): Vitaclip cifra cada secreto con ella
(Argon2id + XChaCha20-Poly1305). La bóveda se bloquea sola a los 5 minutos sin uso. Lo que pegas desde la bóveda **no entra nunca en el
historial** y los secretos no se muestran en pantalla.

> Si olvidas la contraseña maestra no hay forma de recuperar los secretos: no se guarda en ningún sitio.

### Acciones personalizadas
Cadenas de pasos con nombre que se aplican a cualquier elemento. Cada paso puede ser:
**buscar y reemplazar (regex)**, **una transformación**, **añadir prefijo** o **añadir sufijo**.

Ejemplo, «Teléfono bonito»:
1. Regex: buscar `\D` → reemplazar por nada (deja solo los dígitos).
2. Regex: buscar `^(\d{3})(\d{3})(\d{3})$` → reemplazar por `$1 $2 $3`.
3. Prefijo: `+34 `.

`612345678` → `+34 612 345 678`.

### Plantillas con campos
En un fragmento, `{campo:Nombre}` pide el valor antes de pegar y `{campo:Empresa|Acme}` lo pide con «Acme» ya escrito.

```
Hola {campo:Nombre}, te escribo de {campo:Empresa|Acme} por el pedido {campo:Pedido}.
```

### Historial ilimitado
Hasta 10 000 entradas (lo eliges en Ajustes → General) y capturas de pantalla de hasta 20 MB.

---

## Preguntas frecuentes

**Pulso el atajo y no pasa nada.** Puede que otra aplicación ya lo use: elige otro en Ajustes → Atajo. En Wayland usa un atajo del
sistema con `vitaclip --mostrar`.

**En Mac no pega, solo copia.** Dale permiso de Accesibilidad (ver [INSTALACION.md](INSTALACION.md)).

**¿Mis datos salen de mi equipo?** No. Solo si configuras una IA en la nube y la usas, se envía a ese proveedor el texto que le pidas.

**¿Y si pierdo la licencia?** Pide que te la reenvíen. Se comprueba sin conexión, así que sigue funcionando aunque no tengas internet.

**¿Dónde están mis datos?** En una base de datos SQLite en tu carpeta de usuario (rutas en [INSTALACION.md](INSTALACION.md)).
