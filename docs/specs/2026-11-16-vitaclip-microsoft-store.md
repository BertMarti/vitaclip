# Vitaclip en Microsoft Store

Se suma a los diseños anteriores. Origen (16/11/2026): el **Control inteligente de aplicaciones** de Windows 11 bloquea Vitaclip
(sin firma) sin opción de saltarlo. SignPath Foundation pide reputación que el proyecto aún no tiene y componentes con licencia
OSI (FDK AAC no lo es). La Store es gratis para particulares y **Microsoft firma el paquete** al publicarlo.

## 1. Qué cambia para el usuario
- Vitaclip se instala desde Microsoft Store (gratis). Las descargas de GitHub siguen igual (sin firmar, con su actualizador).
- En la versión de la Store:
  - Las actualizaciones las hace la Store. Ajustes → General → Actualizaciones dice «Las actualizaciones llegan por Microsoft
    Store» con un botón «Abrir Microsoft Store» (`ms-windows-store://downloadsandupdates`). No hay comprobación diaria ni aviso.
  - «Iniciar con el sistema» funciona igual en Ajustes, pero por debajo usa la tarea de inicio del paquete (aparece en
    Configuración → Aplicaciones → Inicio y en el Administrador de tareas).
  - Los datos (historial, ajustes) quedan dentro del paquete: no comparte historial con una copia instalada desde GitHub y se
    borran al desinstalar.

## 2. Técnica

### Detectar el paquete
`paquete::empaquetada() -> bool`: en Windows, `GetCurrentPackageFullName` (windows-sys, `Win32_Storage_Packaging_Appx`) devuelve
algo distinto de `APPMODEL_ERROR_NO_PACKAGE` (15700). En macOS y Linux, `false`. Se calcula una vez (`OnceLock`).

### Actualizador (`actualizar.rs`)
- `EstadoActualizacion` gana `tienda: bool` (= `empaquetada()`).
- Con `tienda`: `iniciar` no lanza la comprobación diaria; `actualizacion_buscar` devuelve el estado sin buscar;
  `actualizacion_instalar` devuelve `Err("En la versión de Microsoft Store las actualizaciones llegan por la Store.")`;
  `actualizacion_pagina` abre `ms-windows-store://downloadsandupdates`; no se añade nada al menú de la bandeja.

### Arranque (`arranque.rs`)
Dentro de un paquete MSIX las escrituras en `HKCU` van a un registro privado del paquete, así que la clave `Run` no sirve. Con
`empaquetada()` se usa la API de WinRT `Windows.ApplicationModel.StartupTask` (crate `windows`, la 0.61 que ya trae Tauri,
features `ApplicationModel` y `Foundation`) con el id **`VitaclipInicio`** (el del manifiesto):
- estado activo = `Enabled` o `EnabledByPolicy`;
- activar = `RequestEnableAsync` (en apps de escritorio no pregunta). Si queda `DisabledByUser` →
  `Err("Windows tiene desactivado el inicio de Vitaclip: actívalo en Configuración → Aplicaciones → Inicio.")`;
  `DisabledByPolicy` → `Err("Una directiva del equipo impide que Vitaclip se inicie con Windows.")`;
- desactivar = `Disable()`.
- Las llamadas de WinRT van en un hilo aparte (`std::thread::spawn(...).join()`) para no bloquear el hilo de la interfaz con un
  `.get()` de una operación asíncrona.
- La tarea de inicio lanza la app sin argumentos, que es lo mismo que `--oculto` (sin `--mostrar`/`--captura`/`--video` la app
  se queda en la bandeja).

### Paquete MSIX
- `src-tauri/msix/AppxManifest.xml` (plantilla): `Windows.Desktop` 10.0.17763.0 o posterior; `runFullTrust`; `microphone`;
  `desktop:StartupTask` con `TaskId="VitaclipInicio"`, `Enabled="false"` (la app la activa la primera vez, como ya hace con la
  clave `Run`). Idiomas es-ES y en-US. Iconos desde `src-tauri/icons/` (Square44x44Logo, Square150x150Logo, StoreLogo…).
- Identidad (la da Partner Center al reservar el nombre): variables del repositorio `MSSTORE_NOMBRE` (Identity/Name),
  `MSSTORE_EDITOR` (Identity/Publisher, `CN=…`) y `MSSTORE_EDITOR_VISIBLE` (PublisherDisplayName). Sin ellas se usa una identidad
  de prueba (`BertMarti.Vitaclip`, `CN=BertMarti`).
- Versión `x.y.z.0` (la Store exige el cuarto número a 0).
- `.github/scripts/crear-msix.ps1`: copia `vitaclip.exe` y los iconos a una carpeta, rellena la plantilla y empaqueta con
  `makeappx.exe` del Windows SDK del runner. El paquete va **sin firmar**: lo firma la Store.
- `release.yml`: el trabajo de Windows crea el MSIX y lo deja como artefacto del workflow (`vitaclip-msix`), no en la release
  (sin firma no se puede instalar fuera de la Store).

### Prueba (`prueba-msix.yml`, manual)
Compila, crea el MSIX con la identidad de prueba, lo firma con un certificado autofirmado de usar y tirar (confiado solo en ese
runner), lo instala con `Add-AppxPackage`, lo abre por `shell:AppsFolder` y comprueba con UI Automation que Ajustes muestra «Las
actualizaciones llegan por Microsoft Store» y que la tarea de inicio quedó activada.

## 3. Lo que hace Alberto (una vez)
1. Darse de alta gratis como desarrollador particular en Partner Center (storedeveloper.microsoft.com) con su cuenta Microsoft y
   verificar su identidad.
2. Reservar el nombre **Vitaclip** y copiar de *Product identity* los tres valores de la identidad (no son secretos) → variables
   del repositorio.
3. Primera publicación: subir el `.msix` del artefacto y completar la ficha (textos y capturas que prepara Claude, clasificación
   por edades, política de privacidad = `docs/PRIVACIDAD.md`). Las siguientes versiones: subir el `.msix` nuevo.
