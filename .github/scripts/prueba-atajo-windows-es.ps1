# Prueba con teclado español: configura Ctrl+Shift+Ñ (tecla física "Semicolon") y la pulsa por código de exploración,
# como un teclado real. Antes de la 0.2, la librería registraba la tecla como si el teclado fuera estadounidense.
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
  [DllImport("user32.dll")] public static extern uint MapVirtualKeyEx(uint code, uint type, IntPtr hkl);
  [DllImport("user32.dll")] public static extern IntPtr GetKeyboardLayout(uint thread);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr LoadKeyboardLayout(string id, uint flags);
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
Add-Type -AssemblyName System.Windows.Forms

# 1) Teclado español para el usuario (las apps que se abran a partir de ahora lo usan).
Set-WinUserLanguageList -LanguageList es-ES -Force
$hkl = [W]::LoadKeyboardLayout("0000040A", 1)
Write-Host ("Tecla física 0x27 (Ñ) con teclado español = VK 0x{0:X2}" -f [W]::MapVirtualKeyEx(0x27, 1, $hkl))

# 2) Primer arranque para crear la base de datos y cerrar.
$app = Start-Process -FilePath $Exe -PassThru
Start-Sleep -Seconds 8
Stop-Process -Id $app.Id -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# 3) Configurar el atajo Ctrl+Shift+Ñ como lo guarda la interfaz.
# Desde la 0.3 los datos están en Local (no en Roaming).
$db = Join-Path $env:LOCALAPPDATA "com.bertmarti.vitaclip\vitaclip.db"
if (-not (Test-Path $db)) { throw "No encuentro la base de datos en $db" }
python -c @"
import json, sqlite3, sys
c = sqlite3.connect(sys.argv[1])
fila = c.execute("SELECT valor FROM ajustes WHERE clave='ajustes'").fetchone()
a = json.loads(fila[0]) if fila else {}
a['atajo'] = 'CommandOrControl+Shift+Semicolon'
a.setdefault('atajos', {})['popup'] = 'CommandOrControl+Shift+Semicolon'
c.execute("INSERT OR REPLACE INTO ajustes(clave, valor) VALUES('ajustes', ?)", (json.dumps(a),))
c.execute("INSERT OR REPLACE INTO ajustes(clave, valor) VALUES('bienvenida', '1')")
c.commit()
print('Atajo configurado:', a['atajo'])
"@ $db
if ($LASTEXITCODE -ne 0) { throw "No se pudo configurar el atajo de prueba" }

# 4) Arrancar de nuevo, poner el Bloc de notas delante y pulsar Ctrl+Shift + tecla física Ñ.
$app = Start-Process -FilePath $Exe -PassThru
Start-Sleep -Seconds 8
$bloc = Start-Process notepad -PassThru
Start-Sleep -Seconds 3
$popup = [W]::Buscar("Vitaclip")
if ($popup -eq [IntPtr]::Zero) { throw "No encuentro la ventana del popup" }
$aciertos = 0
foreach ($intento in 1..3) {
  [W]::keybd_event(0x11, 0x1D, 0, [UIntPtr]::Zero)          # Ctrl
  [W]::keybd_event(0x10, 0x2A, 0, [UIntPtr]::Zero)          # Shift
  [W]::keybd_event(0, 0x27, 8, [UIntPtr]::Zero)             # tecla física Ñ por código de exploración
  Start-Sleep -Milliseconds 60
  [W]::keybd_event(0, 0x27, 8 -bor 2, [UIntPtr]::Zero)
  [W]::keybd_event(0x10, 0x2A, 2, [UIntPtr]::Zero)
  [W]::keybd_event(0x11, 0x1D, 2, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 1500
  $visible = [W]::IsWindowVisible($popup)
  Write-Host "Intento ${intento} (Ctrl+Shift+Ñ): visible = $visible, delante = '$([W]::Titulo([W]::GetForegroundWindow()))'"
  if ($visible) { $aciertos++ }
  [System.Windows.Forms.SendKeys]::SendWait("{ESC}"); Start-Sleep -Milliseconds 500
  [W]::SetForegroundWindow($bloc.MainWindowHandle) | Out-Null; Start-Sleep -Seconds 1
}
Stop-Process -Id $app.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $bloc.Id -Force -ErrorAction SilentlyContinue
Write-Host "Ctrl+Shift+Ñ con teclado español abrió el popup en $aciertos de 3 intentos."
if ($aciertos -lt 3) { exit 1 }
