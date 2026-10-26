# Firma de código en Windows

## Por qué Windows avisa al instalar Vitaclip

El aviso azul **«Windows protegió su PC»** es **SmartScreen**. No dice que Vitaclip sea malicioso: dice que el archivo **no está
firmado** y que todavía no tiene «reputación» (pocas personas lo han descargado). Es lo que les pasa a casi todos los programas
pequeños y gratuitos.

Para que desaparezca hacen falta dos cosas:
1. **Firmar** los instaladores con un certificado de una autoridad reconocida (Authenticode). Así Windows sabe quién publica el
   programa y que nadie lo ha modificado.
2. **Reputación**: con la firma, SmartScreen deja de avisar a medida que se descarga y se instala sin problemas. Con un certificado
   nuevo puede tardar unos días o semanas en desaparecer del todo.

Un certificado autofirmado **no sirve**: Windows lo trata igual que un programa sin firmar.

## Opción recomendada (gratis): SignPath Foundation

[SignPath Foundation](https://signpath.org) firma gratis proyectos de código abierto con un certificado real. Vitaclip cumple sus
requisitos: licencia MIT, código público, versiones compiladas en GitHub Actions a partir del código del repositorio y sin
componentes de pago ni publicidad.

**El repositorio ya está preparado**: `release.yml` firma el instalador `.exe` y los `.msi` en cuanto existen las credenciales, y
`.signpath/artifact-configuration.xml` describe qué se firma.

### Lo que tienes que hacer tú (una vez)
1. Solicita el alta en **https://signpath.org/apply** con tu cuenta de GitHub, indicando el repositorio
   `https://github.com/BertMarti/vitaclip`. Revisarán el proyecto y te responderán (puede tardar días).
2. Cuando te acepten, en **app.signpath.io**:
   - Crea el proyecto con el identificador **`vitaclip`**.
   - En *Artifact configurations*, crea **`initial`** y pega el contenido de `.signpath/artifact-configuration.xml`.
   - En *Signing policies*, usa (o crea) **`release-signing`** con el certificado que te asignen.
   - En *Trusted build systems*, añade **GitHub.com** y vincúlalo al proyecto.
   - Crea un usuario de CI y copia su **API token**.
3. En GitHub → **Settings → Secrets and variables → Actions** del repositorio:
   - *Secret* `SIGNPATH_API_TOKEN` = el token del paso anterior.
   - *Variable* `SIGNPATH_ORGANIZATION_ID` = el identificador de tu organización en SignPath.
   - (Opcional) variables `SIGNPATH_PROJECT`, `SIGNPATH_SIGNING_POLICY`, `SIGNPATH_ARTIFACT_CONFIGURATION` si usas otros nombres.
4. Publica una versión nueva (`git tag vX.Y.Z && git push --tags`). Cada solicitud de firma hay que **aprobarla en SignPath**
   (te llega un aviso); la publicación espera a que la apruebes.

Mientras no existan esas credenciales, las versiones se siguen publicando igual, sin firmar.

## Política de firma de código

SignPath Foundation pide que el proyecto publique esta política. Rige desde que se active la firma:

- Los binarios de Windows se firman con un certificado de **SignPath Foundation**, con firma de código gratuita de
  [SignPath.io](https://signpath.io).
- Solo se firman versiones compiladas por GitHub Actions a partir de este repositorio público (`release.yml`).
- **Autores y revisores**: [BertMarti](https://github.com/BertMarti). **Aprobación de cada firma**: BertMarti.
- **Privacidad**: Vitaclip no envía información a ningún sistema en red salvo que el usuario lo pida expresamente (la IA, solo si la
  configura). Ver la sección «Privacidad» del [README](../README.md).

## Otras opciones

| Opción | Coste | Notas |
|---|---|---|
| SignPath Foundation | Gratis | Solo código abierto; hay que aprobar cada firma. **Recomendada.** |
| Microsoft Store | Gratis para particulares | Microsoft firma el paquete; hay que publicar como MSIX y pasar su revisión. |
| Azure Artifact Signing (antes Trusted Signing) | ~10 $/mes | Exige verificar identidad; disponibilidad limitada para particulares según el país. |
| Certificado OV comercial | ~150-300 €/año | La reputación de SmartScreen se gana igualmente con el tiempo. |

## Si Microsoft Defender lo marca como virus

Eso sería un **falso positivo** (distinto del aviso de SmartScreen). La prueba de Windows del repositorio (`prueba-windows.yml`)
analiza los instaladores publicados con Defender. Si alguna vez lo detecta, se comunica a Microsoft como desarrollador en
**https://www.microsoft.com/wdsi/filesubmission** («Software developer»), adjuntando el instalador.
