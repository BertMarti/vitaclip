#!/usr/bin/env bash
# Genera latest.json (lo que lee el actualizador) a partir de los instaladores y sus .sig de una carpeta.
# Uso: generar-latest-json.sh <carpeta> <etiqueta vX.Y.Z> <dueño/repositorio> <archivo con las notas>
# Se hace en un solo paso al final porque, si cada compilación sube su parte, se pisan entre ellas.
set -euo pipefail
carpeta=$1 etiqueta=$2 repositorio=$3 notas=$4
base="https://github.com/$repositorio/releases/download/$etiqueta"
cd "$carpeta"

json=$(jq -n --arg v "${etiqueta#v}" --rawfile n "$notas" --arg d "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  '{version: $v, notes: ($n | rtrimstr("\n")), pub_date: $d, platforms: {}}')

# plataforma <patrón del archivo> <claves...>: el patrón debe dar exactamente un archivo con su firma.
plataforma() {
  local patron=$1; shift
  local archivos=($patron)
  if [ "${#archivos[@]}" -ne 1 ] || [ ! -f "${archivos[0]}" ] || [ ! -f "${archivos[0]}.sig" ]; then
    echo "Falta el instalador (o su .sig) que encaja con «$patron»" >&2
    exit 1
  fi
  local clave
  for clave in "$@"; do
    json=$(jq --arg c "$clave" --arg u "$base/${archivos[0]}" --rawfile s "${archivos[0]}.sig" \
      '.platforms[$c] = {signature: ($s | rtrimstr("\n")), url: $u}' <<<"$json")
  done
}

# Sin sufijo: la que se usa si la app no sabe con qué se instaló. En Windows se recomienda el NSIS.
plataforma "*_x64-setup.exe" windows-x86_64 windows-x86_64-nsis
plataforma "*_x64_es-ES.msi" windows-x86_64-msi
plataforma "Vitaclip_aarch64.app.tar.gz" darwin-aarch64 darwin-aarch64-app
plataforma "Vitaclip_x64.app.tar.gz" darwin-x86_64 darwin-x86_64-app
plataforma "*_amd64.AppImage" linux-x86_64 linux-x86_64-appimage
plataforma "*_aarch64.AppImage" linux-aarch64 linux-aarch64-appimage
plataforma "*_amd64.deb" linux-x86_64-deb
plataforma "*_arm64.deb" linux-aarch64-deb
plataforma "*.x86_64.rpm" linux-x86_64-rpm
plataforma "*.aarch64.rpm" linux-aarch64-rpm

jq . <<<"$json" > latest.json
jq -r '.platforms | keys[]' latest.json
