# Analiza con Microsoft Defender los instaladores de Windows de la última versión publicada.
# Sirve para distinguir el aviso de reputación de SmartScreen («Windows protegió su PC», normal sin firma) de una detección
# real de Defender (falso positivo que habría que comunicar a Microsoft).
param([string]$Repo = "BertMarti/vitaclip")
$ErrorActionPreference = "Continue"
New-Item -ItemType Directory -Force defender | Out-Null
gh release download --pattern "*.exe" --pattern "*.msi" -D defender -R $Repo --clobber
$mp = Join-Path $env:ProgramFiles "Windows Defender\MpCmdRun.exe"
& $mp -SignatureUpdate | Out-Null
Get-MpComputerStatus | Select-Object AntivirusSignatureVersion, AntivirusSignatureLastUpdated | Format-List
$amenazas = 0
foreach ($archivo in Get-ChildItem defender -File) {
  Write-Host "== $($archivo.Name)"
  $salida = & $mp -Scan -ScanType 3 -File $archivo.FullName -DisableRemediation
  $salida | ForEach-Object { Write-Host "   $_" }
  if ($salida -match "found \d+ threats" -and $salida -notmatch "found no threats") { $amenazas++ }
  $firma = Get-AuthenticodeSignature $archivo.FullName
  Write-Host "   Firma: $($firma.Status) $($firma.SignerCertificate.Subject)"
}
Write-Host "Instaladores con detecciones de Defender: $amenazas"
