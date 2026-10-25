# Prueba real del atajo global en Windows: arranca Vitaclip, pone el Bloc de notas delante,
# pulsa Ctrl+Alt+V como lo haría una persona y comprueba que el popup aparece y sigue visible.
param([string]$Exe = "src-tauri\target\debug\vitaclip.exe")
$ErrorActionPreference = "Stop"
# Por si una prueba anterior dejó la app abierta (la segunda instancia se cerraría sola).
Get-Process vitaclip -ErrorAction SilentlyContinue | Stop-Process -Force

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class W {
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc f, IntPtr l);
  public static IntPtr Buscar(string titulo) {
    IntPtr encontrada = IntPtr.Zero;
    EnumWindows((h, l) => { var s = new StringBuilder(256); GetWindowText(h, s, 256);
      if (s.ToString() == titulo) { encontrada = h; return false; } return true; }, IntPtr.Zero);
    return encontrada;
  }
  public static string Titulo(IntPtr h) { var s = new StringBuilder(256); GetWindowText(h, s, 256); return s.ToString(); }
}
"@
Add-Type -AssemblyName System.Windows.Forms, System.Drawing

function Captura($nombre) {
  $b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
  $bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size)
  $bmp.Save("capturas\$nombre.png")
}
function Pulsar-Atajo {
  # Ctrl (0x11) + Alt (0x12) + V (0x56)
  [W]::keybd_event(0x11, 0, 0, [UIntPtr]::Zero); [W]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero)
  [W]::keybd_event(0x56, 0, 0, [UIntPtr]::Zero); Start-Sleep -Milliseconds 60
  [W]::keybd_event(0x56, 0, 2, [UIntPtr]::Zero); [W]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
  [W]::keybd_event(0x11, 0, 2, [UIntPtr]::Zero)
}

New-Item -ItemType Directory -Force capturas | Out-Null
$app = Start-Process -FilePath $Exe -PassThru
Start-Sleep -Seconds 8
# La primera vez se abren los ajustes (bienvenida): se cierran para quedarnos como un usuario normal.
$ajustes = [W]::Buscar("Vitaclip · Ajustes")
if ($ajustes -ne [IntPtr]::Zero) { [System.Windows.Forms.SendKeys]::SendWait("%{F4}"); Start-Sleep -Seconds 1 }

$bloc = Start-Process notepad -PassThru
Start-Sleep -Seconds 3
$popup = [W]::Buscar("Vitaclip")
if ($popup -eq [IntPtr]::Zero) { throw "No encuentro la ventana del popup" }
Write-Host "Delante antes del atajo: '$([W]::Titulo([W]::GetForegroundWindow()))'"
Captura "1-antes"

$resultados = @()
foreach ($intento in 1..3) {
  Pulsar-Atajo
  Start-Sleep -Milliseconds 400
  $visible400 = [W]::IsWindowVisible($popup)
  Start-Sleep -Milliseconds 1200
  $visible1600 = [W]::IsWindowVisible($popup)
  $delante = [W]::Titulo([W]::GetForegroundWindow())
  Captura "2-intento-$intento"
  Write-Host "Intento ${intento}: visible a 0,4 s = $visible400, a 1,6 s = $visible1600, delante = '$delante'"
  $resultados += $visible1600
  # Volver al Bloc de notas para el siguiente intento.
  [System.Windows.Forms.SendKeys]::SendWait("{ESC}"); Start-Sleep -Milliseconds 500
  [W]::SetForegroundWindow($bloc.MainWindowHandle) | Out-Null; Start-Sleep -Seconds 1
}

Stop-Process -Id $app.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $bloc.Id -Force -ErrorAction SilentlyContinue
$aciertos = ($resultados | Where-Object { $_ }).Count
Write-Host "El popup quedó visible en $aciertos de 3 intentos."
if ($aciertos -lt 3) { exit 1 }
