import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { TEXTOS, t, setIdioma, existe } from '../src/js/i18n.js';

const carpeta = new URL('../src/js/', import.meta.url);

// Todos los módulos de la interfaz (también los de herramientas/), sin los diccionarios.
function fuentesJs() {
  const lista = [];
  for (const sub of ['', 'herramientas/']) {
    const dir = new URL(sub, carpeta);
    for (const nombre of readdirSync(dir).filter(archivo => archivo.endsWith('.js') && !archivo.startsWith('textos-'))) {
      lista.push([`${sub}${nombre}`, readFileSync(new URL(nombre, dir), 'utf8')]);
    }
  }
  return lista;
}

test('español e inglés tienen exactamente las mismas claves', () => {
  const es = Object.keys(TEXTOS.es).sort();
  const en = Object.keys(TEXTOS.en).sort();
  assert.deepEqual(es.filter(clave => !TEXTOS.en[clave]), []);
  assert.deepEqual(en.filter(clave => !TEXTOS.es[clave]), []);
});

test('cada t("clave") literal del código existe en el diccionario', () => {
  const faltan = [];
  for (const [archivo, texto] of fuentesJs()) {
    const fuente = texto.replace(/^\s*\/\/.*$/gm, '');
    for (const [, clave] of fuente.matchAll(/\bt\(\s*'([\w.]+)'/g)) {
      if (!TEXTOS.es[clave]) faltan.push(`${archivo}: ${clave}`);
    }
  }
  assert.deepEqual(faltan, []);
});

// Una clave está viva si aparece literal ('clave') o si encaja en una plantilla `prefijo.${…}sufijo`.
test('no quedan claves sin usar en el código', () => {
  const fuentes = fuentesJs().map(([, texto]) => texto).join('\n');
  const plantillas = [...fuentes.matchAll(/`([\w.]*\.[\w.]*)\$\{[^}]+\}([\w.]*)`/g)].map(([, antes, despues]) => [antes, despues]);
  const muertas = Object.keys(TEXTOS.es).filter(clave => (
    !fuentes.includes(`'${clave}'`)
    && !plantillas.some(([antes, despues]) => clave.startsWith(antes) && clave.endsWith(despues) && clave.length > antes.length + despues.length)
  ));
  assert.deepEqual(muertas, []);
});

test('t sustituye variables y cambia de idioma', () => {
  setIdioma('en');
  assert.equal(t('aviso.copiado', { tecla: '⌘V' }), 'Copied. Paste with ⌘V');
  setIdioma('xx');
  assert.equal(t('aviso.copiado', { tecla: 'Ctrl+V' }), 'Copiado. Pega con Ctrl+V');
  assert.equal(existe('error.json_invalido'), true);
  assert.equal(existe('error.inventado'), false);
});

test('los plurales eligen singular solo con 1', async () => {
  const { t, setIdioma } = await import('../src/js/i18n.js');
  setIdioma('es');
  assert.equal(t('clip.contadores', { caracteres: 1, palabras: 2, lineas: 1 }), '1 carácter · 2 palabras · 1 línea');
  assert.equal(t('boveda.cuantos', { n: 0 }), '0 secretos');
  assert.equal(t('capturas.detenerTiempo', { tiempo: '01:05' }), 'Detener · 01:05');
  setIdioma('en');
  assert.equal(t('fragmentos.cuantos', { n: 1 }), '1 snippet');
  setIdioma('es');
});
