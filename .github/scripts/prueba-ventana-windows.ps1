# Prueba real de mover y redimensionar el popup en Windows con un ratón simulado (SendInput).
param([string]$Exe = "src-tauri\target\debug\vitaclip.exe")
$ErrorActionPreference = "Stop"

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class W {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h, ref POINT p);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, int dx, int dy, uint d, UIntPtr e);
  [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(POINT p);
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr h, uint f);
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

function Rect($h) { $r = New-Object W+RECT; [W]::GetWindowRect($h, [ref]$r) | Out-Null; return $r }
# Área útil (sin los bordes invisibles que Windows añade a GetWindowRect), en coordenadas de pantalla.
function Cliente($h) {
  $c = New-Object W+RECT; [W]::GetClientRect($h, [ref]$c) | Out-Null
  $p = New-Object W+POINT; $p.X = 0; $p.Y = 0; [W]::ClientToScreen($h, [ref]$p) | Out-Null
  $r = New-Object W+RECT; $r.L = $p.X; $r.T = $p.Y; $r.R = $p.X + $c.R; $r.B = $p.Y + $c.B
  return $r
}
function Texto($r) { "x=$($r.L) y=$($r.T) ancho=$($r.R - $r.L) alto=$($r.B - $r.T)" }
function Captura($nombre) {
  $b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
  $bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height
  [System.Drawing.Graphics]::FromImage($bmp).CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size)
  $bmp.Save("capturas\$nombre.png")
}
function Quien($x, $y) {
  $p = New-Object W+POINT; $p.X = $x; $p.Y = $y
  $h = [W]::GetAncestor([W]::WindowFromPoint($p), 2)
  return "'$([W]::Titulo($h))'"
}
function Arrastrar($x0, $y0, $dx, $dy) {
  [W]::SetCursorPos($x0, $y0) | Out-Null; Start-Sleep -Milliseconds 300
  [W]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)           # botón izquierdo abajo
  Start-Sleep -Milliseconds 250
  foreach ($i in 1..20) {
    [W]::SetCursorPos($x0 + [int]($dx * $i / 20), $y0 + [int]($dy * $i / 20)) | Out-Null
    Start-Sleep -Milliseconds 30
  }
  Start-Sleep -Milliseconds 200
  [W]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)           # botón izquierdo arriba
  Start-Sleep -Milliseconds 600
}

New-Item -ItemType Directory -Force capturas | Out-Null
Get-Process vitaclip -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1
$app = Start-Process -FilePath $Exe -PassThru
Start-Sleep -Seconds 8
$ajustes = [W]::Buscar("Vitaclip · Ajustes")
if ($ajustes -ne [IntPtr]::Zero) { [System.Windows.Forms.SendKeys]::SendWait("%{F4}"); Start-Sleep -Seconds 1 }

# Abrir el popup en una zona libre de la pantalla.
[W]::SetCursorPos(150, 60) | Out-Null
Start-Process -FilePath $Exe -ArgumentList "--mostrar" | Out-Null
Start-Sleep -Seconds 3
$popup = [W]::Buscar("Vitaclip")
if (-not [W]::IsWindowVisible($popup)) { throw "El popup no se ve" }
$antes = Cliente $popup
Write-Host "Popup al abrir: $(Texto $antes) (con bordes invisibles: $(Texto (Rect $popup)))"
Captura "ventana-1-abierta"

# 1) MOVER: arrastrar desde el pie (zona de la pista, a la izquierda), 200 px a la derecha y 60 abajo.
# (El cursor no puede salir de la pantalla del runner, de 1024x768.)
$px = $antes.L + 30; $py = $antes.B - 10
Write-Host "Bajo el ratón en el pie ($px,$py): $(Quien $px $py)"
Arrastrar $px $py 200 60
$movida = Cliente $popup
Write-Host "Tras arrastrar el pie: $(Texto $movida) · visible=$([W]::IsWindowVisible($popup))"
Captura "ventana-2-movida"
$mueve = ($movida.L - $antes.L) -ge 150 -and ($movida.T - $antes.T) -ge 40

# 2) MOVER desde la cabecera (hueco entre las pestañas y el engranaje).
$antes2 = $movida
$cx = $antes2.L + [int](($antes2.R - $antes2.L) * 0.6); $cy = $antes2.T + 52
Write-Host "Bajo el ratón en la cabecera ($cx,$cy): $(Quien $cx $cy)"
Arrastrar $cx $cy (-150) (-40)
$movida2 = Cliente $popup
Write-Host "Tras arrastrar la cabecera: $(Texto $movida2) · visible=$([W]::IsWindowVisible($popup))"
$mueveCabecera = ($antes2.L - $movida2.L) -ge 100

# 3) REDIMENSIONAR: asa de la esquina inferior derecha, 150 px más ancho y 100 más alto.
$r = Cliente $popup
$ax = $r.R - 7; $ay = $r.B - 7
Write-Host "Bajo el ratón en el asa ($ax,$ay): $(Quien $ax $ay)"
Arrastrar $ax $ay 150 (60)
$grande = Cliente $popup
Write-Host "Tras tirar del asa: $(Texto $grande) · visible=$([W]::IsWindowVisible($popup))"
Captura "ventana-3-redimensionada"
$redimensiona = (($grande.R - $grande.L) - ($r.R - $r.L)) -ge 100 -and (($grande.B - $grande.T) - ($r.B - $r.T)) -ge 40

Stop-Process -Id $app.Id -Force -ErrorAction SilentlyContinue
Write-Host "RESULTADO: mover desde el pie=$mueve · mover desde la cabecera=$mueveCabecera · redimensionar=$redimensiona"
if (-not ($mueve -and $mueveCabecera -and $redimensiona)) { exit 1 }
