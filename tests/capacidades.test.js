// Cada ventana solo tiene permiso para los comandos de Rust que usa (src-tauri/capabilities/<ventana>.json).
// Esta prueba recorre los módulos que carga cada página y comprueba que todo comando que llaman está permitido,
// y que no se da permiso a ninguno que no usen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const api = readFileSync(join(raiz, 'src/js/api.js'), 'utf8');
const comandoDe = Object.fromEntries(
  [...api.matchAll(/export const (\w+)\s*=\s*(?:\w+|\([^)]*\))\s*=>\s*invoke\('([a-z_]+)'/g)].map(m => [m[1], m[2]]),
);

function modulos(archivo, vistos = new Set()) {
  if (vistos.has(archivo) || !existsSync(archivo)) return vistos;
  vistos.add(archivo);
  const codigo = readFileSync(archivo, 'utf8');
  for (const m of codigo.matchAll(/(?:import|export)[^'"]*from\s*['"](\.[^'"]+)['"]|import\(\s*['"](\.[^'"]+)['"]\s*\)/g)) {
    modulos(resolve(dirname(archivo), m[1] ?? m[2]), vistos);
  }
  return vistos;
}

function comandosUsados(pagina) {
  const html = readFileSync(join(raiz, `src/${pagina}.html`), 'utf8');
  const usados = new Set();
  for (const [, script] of html.matchAll(/src="(js\/[^"]+)"/g)) {
    for (const archivo of modulos(resolve(raiz, 'src', script))) {
      if (archivo.endsWith('api.js') || archivo.includes('simulador')) continue;
      const codigo = readFileSync(archivo, 'utf8');
      for (const [funcion, comando] of Object.entries(comandoDe)) {
        if (new RegExp(`\\b${funcion}\\b`).test(codigo)) usados.add(comando);
      }
    }
  }
  return usados;
}

for (const [ventana, pagina] of [['popup', 'index'], ['ajustes', 'ajustes'], ['captura', 'captura'], ['grabacion', 'grabacion']]) {
  test(`la ventana ${ventana} tiene justo los permisos que usa`, () => {
    const capacidad = JSON.parse(readFileSync(join(raiz, `src-tauri/capabilities/${ventana}.json`), 'utf8'));
    const permitidos = new Set(capacidad.permissions.filter(p => p.startsWith('allow-')).map(p => p.slice(6).replaceAll('-', '_')));
    const usados = comandosUsados(pagina);
    assert.deepEqual([...usados].filter(c => !permitidos.has(c)), [], 'comandos usados sin permiso');
    assert.deepEqual([...permitidos].filter(c => !usados.has(c)), [], 'permisos que no usa');
  });
}

test('todo comando registrado en Rust tiene su permiso en build.rs', () => {
  const lib = readFileSync(join(raiz, 'src-tauri/src/lib.rs'), 'utf8');
  const build = readFileSync(join(raiz, 'src-tauri/build.rs'), 'utf8');
  const registrados = [...lib.matchAll(/comandos::([a-z_]+)/g)].map(m => m[1]);
  assert.ok(registrados.length > 40);
  for (const comando of registrados) {
    assert.ok(build.includes(`"${comando}"`), comando);
  }
});
