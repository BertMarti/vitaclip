# Capturas para la ficha de Microsoft Store: instala una versión publicada, copia unos textos de ejemplo y fotografía la
# ventanita del historial, los Ajustes y el editor de capturas. Cada ventana se guarda recortada en capturas/ (se componen
# después sobre un fondo del tamaño que pide la Store).
param(
  [Parameter(Mandatory)] [string] $Instalador
)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms, System.Drawing, UIAutomationClient, UIAutomationTypes
New-Item -ItemType Directory -Force capturas | Out-Null

# Pantalla más grande que la de serie (1024×768) si el sistema lo permite.
try { Set-DisplayResolution -Width 1920 -Height 1080 -Force -ErrorAction Stop; Start-Sleep -Seconds 3 } catch { Write-Host "Sin cambiar la resolución: $_" }

function Foto($nombre, $rect = $null) {
  if (-not $rect) { $rect = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds }
  $bmp = New-Object System.Drawing.Bitmap ([int]$rect.Width), ([int]$rect.Height)
  [System.Drawing.Graphics]::FromImage($bmp).CopyFromScreen([int]$rect.X, [int]$rect.Y, 0, 0, $bmp.Size)
  $bmp.Save("capturas\$nombre.png")
  Write-Host "Captura: $nombre ($([int]$rect.Width)×$([int]$rect.Height))"
}
$raiz = [System.Windows.Automation.AutomationElement]::RootElement
$arbol = [System.Windows.Automation.TreeScope]
function Ventanas {
  foreach ($proceso in Get-Process vitaclip -ErrorAction SilentlyContinue) {
    $dePropio = New-Object System.Windows.Automation.PropertyCondition ([System.Windows.Automation.AutomationElement]::ProcessIdProperty), $proceso.Id
    $raiz.FindAll($arbol::Children, $dePropio)
  }
}
function Ventana($titulo, $segundos = 30) {
  $limite = (Get-Date).AddSeconds($segundos)
  while ((Get-Date) -lt $limite) {
    $v = Ventanas | Where-Object { $_.Current.Name -like $titulo -and -not $_.Current.BoundingRectangle.IsEmpty } | Select-Object -First 1
    if ($v) { return $v }
    Start-Sleep -Seconds 1
  }
  throw "No aparece la ventana «$titulo»"
}
function Pulsar($ventana, $nombre) {
  $condicion = New-Object System.Windows.Automation.PropertyCondition ([System.Windows.Automation.AutomationElement]::NameProperty), $nombre
  $x = $ventana.FindFirst($arbol::Descendants, $condicion)
  if (-not $x) { throw "No aparece «$nombre»" }
  $x.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
}

# 1) Instalar y abrir: la primera vez salen los Ajustes de bienvenida.
Start-Process $Instalador -ArgumentList "/S" -Wait
$exe = (Get-ChildItem "$env:LOCALAPPDATA\Vitaclip\*.exe" | Where-Object Name -notmatch "uninstall" | Select-Object -First 1).FullName
Start-Process $exe
$ajustes = Ventana "*Ajustes*" 60
Start-Sleep -Seconds 4
Foto "ajustes-general" $ajustes.Current.BoundingRectangle
Pulsar $ajustes "Capturas y vídeo"
Start-Sleep -Seconds 2
Foto "ajustes-capturas" $ajustes.Current.BoundingRectangle
$ajustes.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern).Close()
Start-Sleep -Seconds 2

# 2) Historial con textos de ejemplo (sin datos reales).
$ejemplos = @(
  "Calle Mayor 12, 28013 Madrid",
  "SELECT nombre, correo FROM clientes WHERE activo = 1;",
  "#3BA55C",
  "https://github.com/BertMarti/vitaclip",
  "ana@example.com",
  "Gracias por tu mensaje, te respondo mañana sin falta.",
  "Reunión con el equipo de diseño el jueves a las 10:30"
)
foreach ($t in $ejemplos) { Set-Clipboard -Value $t; Start-Sleep -Milliseconds 1500 }
Start-Process $exe -ArgumentList "--mostrar"
$popup = Ventana "Vitaclip" 20
Start-Sleep -Seconds 3
Foto "historial" $popup.Current.BoundingRectangle
Foto "historial-pantalla"
[System.Windows.Forms.SendKeys]::SendWait("{ESC}")
Start-Sleep -Seconds 2

# 3) Editor de capturas sobre el escritorio.
Start-Process $exe -ArgumentList "--captura"
Start-Sleep -Seconds 6
Foto "editor-captura"
[System.Windows.Forms.SendKeys]::SendWait("{ESC}")
Write-Host "RESULTADO CAPTURAS: hechas"
