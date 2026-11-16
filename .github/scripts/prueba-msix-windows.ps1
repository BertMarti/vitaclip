# Prueba real del paquete de Microsoft Store: lo firma con un certificado de usar y tirar (confiado solo en este equipo), lo
# instala, lo abre como lo haría una persona y comprueba desde Ajustes que las actualizaciones quedan en manos de la Store y que
# el inicio con Windows usa la tarea del paquete.
param(
  [Parameter(Mandatory)] [string] $Msix
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
$raiz = [System.Windows.Automation.AutomationElement]::RootElement
$arbol = [System.Windows.Automation.TreeScope]
function Elemento($nombre, $segundos = 30) {
  $limite = (Get-Date).AddSeconds($segundos)
  $condicion = New-Object System.Windows.Automation.PropertyCondition ([System.Windows.Automation.AutomationElement]::NameProperty), $nombre
  while ((Get-Date) -lt $limite) {
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

# 1) Firma de prueba con el mismo editor que dice el manifiesto (si no coinciden, Windows no lo instala).
$editor = if ($env:MSSTORE_EDITOR) { $env:MSSTORE_EDITOR } else { 'CN=BertMarti' }
$cert = New-SelfSignedCertificate -Type Custom -Subject $editor -KeyUsage DigitalSignature -FriendlyName "Vitaclip prueba" `
  -CertStoreLocation Cert:\CurrentUser\My -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}")
Export-Certificate -Cert $cert -FilePath prueba.cer | Out-Null
Import-Certificate -FilePath prueba.cer -CertStoreLocation Cert:\LocalMachine\TrustedPeople | Out-Null
$signtool = Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\signtool.exe" |
  Sort-Object { [version]($_.Directory.Parent.Name) } | Select-Object -Last 1
& $signtool.FullName sign /fd SHA256 /sha1 $cert.Thumbprint /s My $Msix | Out-Host
if ($LASTEXITCODE -ne 0) { throw "signtool falló ($LASTEXITCODE)" }

# 2) Instalación como paquete y primera apertura desde el menú Inicio (se abren los Ajustes de bienvenida).
Add-AppxPackage -Path $Msix
$paquete = Get-AppxPackage | Where-Object { $_.Name -like '*Vitaclip*' } | Select-Object -First 1
if (-not $paquete) { throw "No se instaló el paquete" }
Write-Host "Instalado: $($paquete.PackageFullName)"
Start-Process "shell:AppsFolder\$($paquete.PackageFamilyName)!Vitaclip"
Start-Sleep -Seconds 10
if (-not (Get-Process vitaclip -ErrorAction SilentlyContinue)) { Captura "no-abre"; throw "La app no se abrió" }
Pulsar "General" 60
Start-Sleep -Seconds 3
Captura "ajustes-general"

# 3) Actualizaciones: las lleva la Store (ni «Buscar ahora» ni comprobación propia).
if (-not (Elemento "Las actualizaciones llegan por Microsoft Store." 30)) { Captura "sin-texto-tienda"; throw "Ajustes no dice que las actualizaciones llegan por la Store" }
if (-not (Elemento "Abrir Microsoft Store" 5)) { throw "Falta el botón «Abrir Microsoft Store»" }
if (Elemento "Buscar ahora" 3) { throw "Sigue apareciendo «Buscar ahora» en la versión de la Store" }
Write-Host "Actualizaciones: por la Store, correcto"

# 4) Inicio con Windows: la primera apertura activa la tarea del paquete (State 2 = activada) y no escribe la clave Run.
$tarea = "HKCU:\Software\Classes\Local Settings\Software\Microsoft\Windows\CurrentVersion\AppModel\SystemAppData\$($paquete.PackageFamilyName)\VitaclipInicio"
$estado = (Get-ItemProperty $tarea -ErrorAction SilentlyContinue).State
Write-Host "Tarea de inicio: State=$estado"
if ($estado -ne 2) { throw "La tarea de inicio no quedó activada (State=$estado)" }
$run = Get-ItemProperty HKCU:\Software\Microsoft\Windows\CurrentVersion\Run -ErrorAction SilentlyContinue
if ($run -and $run.PSObject.Properties.Name -contains 'Vitaclip') { throw "Escribió la clave Run fuera del paquete" }

# 5) Desinstalar deja el equipo limpio.
Get-Process vitaclip -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-AppxPackage -Package $paquete.PackageFullName
Write-Host "RESULTADO MSIX: instalado, actualizaciones por la Store e inicio con la tarea del paquete"
