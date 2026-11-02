# Prueba real del actualizador: instala una versión publicada y, desde su ventana de Ajustes (como lo haría una persona), busca
# actualizaciones. Sin -Esperada, debe decir «Tienes la última versión». Con -Esperada X.Y.Z, debe ofrecerla, instalarla y
# volver a abrirse ya en esa versión.
param(
  [Parameter(Mandatory)] [string] $Instalador,
  [string] $Esperada = ""
)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms, System.Drawing, UIAutomationClient, UIAutomationTypes
New-Item -ItemType Directory -Force capturas | Out-Null
function Captura($nombre) {
  $b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
  $bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height
  [System.Drawing.Graphics]::FromImage($bmp).CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size)
  $bmp.Save("capturas\$nombre.png")
}
function VersionInstalada {
  $clave = Get-ChildItem HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall | Where-Object { (Get-ItemProperty $_.PSPath).DisplayName -eq "Vitaclip" }
  if ($clave) { (Get-ItemProperty $clave.PSPath).DisplayVersion }
}
$raiz = [System.Windows.Automation.AutomationElement]::RootElement
$arbol = [System.Windows.Automation.TreeScope]
# Busca en la ventana de Ajustes un elemento por su nombre visible (la interfaz está en WebView2, que se expone por UI Automation).
function Elemento($nombre, $segundos = 30) {
  $limite = (Get-Date).AddSeconds($segundos)
  $condicion = New-Object System.Windows.Automation.PropertyCondition ([System.Windows.Automation.AutomationElement]::NameProperty), $nombre
  while ((Get-Date) -lt $limite) {
    # Todas las ventanas de Vitaclip (el título lo puede cambiar la página).
    foreach ($proceso in Get-Process vitaclip -ErrorAction SilentlyContinue) {
      $dePropio = New-Object System.Windows.Automation.PropertyCondition ([System.Windows.Automation.AutomationElement]::ProcessIdProperty), $proceso.Id
      foreach ($ventana in $raiz.FindAll($arbol::Children, $dePropio)) {
        $x = $ventana.FindFirst($arbol::Descendants, $condicion)
        if ($x) { return $x }
      }
    }
    Start-Sleep -Seconds 2
  }
  return $null
}
function Pulsar($nombre, $segundos = 30) {
  $x = Elemento $nombre $segundos
  if (-not $x) { Captura "falta-$($nombre -replace '\W', '-')"; throw "No aparece «$nombre» en Ajustes" }
  $x.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
  Write-Host "Pulsado: $nombre"
}

# 1) Instalación por usuario de la versión de partida.
$p = Start-Process $Instalador -ArgumentList "/S" -PassThru -Wait
$desde = VersionInstalada
Write-Host "Instalada: $desde (código $($p.ExitCode))"
if (-not $desde) { throw "No se instaló" }
$exe = Get-ChildItem "$env:LOCALAPPDATA\Vitaclip\*.exe" | Where-Object Name -notmatch "uninstall" | Select-Object -First 1

# 2) Primera apertura: se abren los Ajustes de bienvenida. Se va a General y se pulsa «Buscar ahora».
Start-Process $exe.FullName
Start-Sleep -Seconds 8
Pulsar "General" 60
Pulsar "Buscar ahora"
Start-Sleep -Seconds 5
Captura "ajustes-tras-buscar"

if (-not $Esperada) {
  if (-not (Elemento "Tienes la última versión" 60)) { Captura "sin-ultima"; throw "No dijo «Tienes la última versión»" }
  Write-Host "RESULTADO ACTUALIZACIÓN: la $desde ya es la última, correcto"
  exit 0
}

# 3) Hay versión nueva: aviso arriba y «Actualizar y reiniciar».
if (-not (Elemento "Hay una versión nueva: $Esperada" 60)) { Captura "sin-aviso"; throw "No avisó de la $Esperada" }
Pulsar "Actualizar y reiniciar"
$limite = (Get-Date).AddMinutes(4)
while ((Get-Date) -lt $limite -and (VersionInstalada) -ne $Esperada) { Start-Sleep -Seconds 3 }
$ahora = VersionInstalada
$archivo = (Get-Item $exe.FullName).VersionInfo.ProductVersion
Write-Host "Tras actualizar: registro $ahora · ejecutable $archivo"
if ($ahora -ne $Esperada) { Captura "sin-actualizar"; throw "Sigue en $ahora, se esperaba $Esperada" }
# «…y reiniciar»: la app debe volver a abrirse sola.
$limite = (Get-Date).AddSeconds(60)
while ((Get-Date) -lt $limite -and -not (Get-Process vitaclip -ErrorAction SilentlyContinue)) { Start-Sleep -Seconds 2 }
Start-Sleep -Seconds 5
Captura "tras-actualizar"
if (-not (Get-Process vitaclip -ErrorAction SilentlyContinue)) { throw "Se actualizó pero no volvió a abrirse" }
Write-Host "RESULTADO ACTUALIZACIÓN: $desde → $ahora, instalada y reabierta"
