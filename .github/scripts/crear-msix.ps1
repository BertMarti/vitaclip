# Crea el paquete MSIX de Microsoft Store a partir de la compilación de Windows (sin firmar: lo firma la Store).
# Uso: crear-msix.ps1 -Exe <ruta a vitaclip.exe> -Salida <archivo .msix>
# Identidad: variables de entorno MSSTORE_NOMBRE, MSSTORE_EDITOR y MSSTORE_EDITOR_VISIBLE (de Partner Center); sin ellas, la de prueba.
param(
  [Parameter(Mandatory = $true)][string]$Exe,
  [Parameter(Mandatory = $true)][string]$Salida
)
$ErrorActionPreference = 'Stop'
$raiz = Resolve-Path (Join-Path $PSScriptRoot '../..')

function Valor($nombre, $porDefecto) {
  $v = [Environment]::GetEnvironmentVariable($nombre)
  if ([string]::IsNullOrWhiteSpace($v)) { return $porDefecto } else { return $v.Trim() }
}
$nombre = Valor 'MSSTORE_NOMBRE' 'BertMarti.Vitaclip'
$editor = Valor 'MSSTORE_EDITOR' 'CN=BertMarti'
$visible = Valor 'MSSTORE_EDITOR_VISIBLE' 'BertMarti'

# La Store exige cuatro números con el último a 0.
$conf = Get-Content (Join-Path $raiz 'src-tauri/tauri.conf.json') -Raw | ConvertFrom-Json
if ($conf.version -notmatch '^\d+\.\d+\.\d+$') { throw "Versión no válida para MSIX: $($conf.version)" }
$version = "$($conf.version).0"

$carpeta = Join-Path ([IO.Path]::GetTempPath()) ("vitaclip-msix-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path (Join-Path $carpeta 'Assets') | Out-Null
Copy-Item $Exe (Join-Path $carpeta 'vitaclip.exe')
foreach ($icono in 'StoreLogo', 'Square44x44Logo', 'Square150x150Logo') {
  Copy-Item (Join-Path $raiz "src-tauri/icons/$icono.png") (Join-Path $carpeta "Assets/$icono.png")
}

function Xml($s) { [Security.SecurityElement]::Escape($s) }
$manifiesto = (Get-Content (Join-Path $raiz 'src-tauri/msix/AppxManifest.xml') -Raw).
  Replace('{{NOMBRE}}', (Xml $nombre)).Replace('{{EDITOR}}', (Xml $editor)).
  Replace('{{EDITOR_VISIBLE}}', (Xml $visible)).Replace('{{VERSION}}', $version)
if ($manifiesto -match '\{\{') { throw 'Quedan marcas sin rellenar en el manifiesto' }
[IO.File]::WriteAllText((Join-Path $carpeta 'AppxManifest.xml'), $manifiesto, (New-Object Text.UTF8Encoding $false))

# makeappx viene con el Windows SDK de los runners de GitHub; se coge la versión más nueva.
$makeappx = Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\makeappx.exe" |
  Sort-Object { [version]($_.Directory.Parent.Name) } | Select-Object -Last 1
if (-not $makeappx) { throw 'No se encontró makeappx.exe (Windows SDK)' }
& $makeappx.FullName pack /o /d $carpeta /p $Salida | Out-Host
if ($LASTEXITCODE -ne 0) { throw "makeappx falló ($LASTEXITCODE)" }
Remove-Item -Recurse -Force $carpeta
Write-Host "MSIX: $Salida ($nombre $version, $editor)"
