# Prueba real del instalador de Windows: imágenes del asistente, instalación por usuario (sin UAC), icono y registro.
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
New-Item -ItemType Directory -Force capturas | Out-Null
function Captura($nombre) {
  $b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
  $bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height
  [System.Drawing.Graphics]::FromImage($bmp).CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size)
  $bmp.Save("capturas\$nombre.png")
}
$nsis = Get-ChildItem src-tauri\target\release\bundle\nsis\*-setup.exe | Select-Object -First 1
$msis = Get-ChildItem src-tauri\target\release\bundle\msi\*.msi
Write-Host "Instalador NSIS: $($nsis.Name) · MSI: $($msis.Name -join ', ')"

# 1) Asistente NSIS (para ver el lateral y la cabecera) y primer diálogo del MSI.
$asistente = Start-Process $nsis.FullName -PassThru
Start-Sleep -Seconds 6; Captura "instalador-nsis-bienvenida"
[System.Windows.Forms.SendKeys]::SendWait("{ENTER}"); Start-Sleep -Seconds 3; Captura "instalador-nsis-paso2"
Stop-Process -Id $asistente.Id -Force -ErrorAction SilentlyContinue
foreach ($msi in $msis) {
  $p = Start-Process msiexec -ArgumentList "/i `"$($msi.FullName)`"" -PassThru
  Start-Sleep -Seconds 8; Captura "instalador-$($msi.BaseName)"
  Get-Process msiexec -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

# 2) Instalación silenciosa por usuario: no debe pedir administrador.
$p = Start-Process $nsis.FullName -ArgumentList "/S" -PassThru -Wait
Write-Host "Código de salida del instalador: $($p.ExitCode)"
$exe = Get-ChildItem "$env:LOCALAPPDATA\Vitaclip\*.exe" -ErrorAction SilentlyContinue | Where-Object Name -notmatch "uninstall" | Select-Object -First 1
if (-not $exe) { throw "No se instaló en $env:LOCALAPPDATA\Vitaclip (instalación por usuario)" }
Write-Host "Instalado por usuario en: $($exe.FullName)"
$clave = Get-ChildItem HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall | Where-Object { (Get-ItemProperty $_.PSPath).DisplayName -eq "Vitaclip" }
$datos = Get-ItemProperty $clave.PSPath
Write-Host "Aplicaciones instaladas: $($datos.DisplayName) $($datos.DisplayVersion) · editor: $($datos.Publisher) · icono: $($datos.DisplayIcon)"

# 3) Icono del ejecutable instalado (se guarda para verlo).
$icono = [System.Drawing.Icon]::ExtractAssociatedIcon($exe.FullName)
$icono.ToBitmap().Save("capturas\icono-ejecutable.png")
$acceso = Get-ChildItem "$env:APPDATA\Microsoft\Windows\Start Menu\Programs" -Recurse -Filter "Vitaclip*.lnk" | Select-Object -First 1
Write-Host "Acceso directo en el menú Inicio: $($acceso.FullName)"
if ($datos.Publisher -ne "BertMarti") { throw "El editor debería ser BertMarti" }
Write-Host "RESULTADO INSTALADOR: correcto"
