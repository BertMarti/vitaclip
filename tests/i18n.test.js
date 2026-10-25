import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { TEXTOS, t, setIdioma, existe } from '../src/js/i18n.js';

const carpeta = new URL('../src/js/', import.meta.url);

test('español e inglés tienen exactamente las mismas claves', () => {
  const es = Object.keys(TEXTOS.es).sort();
  const en = Object.keys(TEXTOS.en).sort();
  assert.deepEqual(es.filter(clave => !TEXTOS.en[clave]), []);
  assert.deepEqual(en.filter(clave => !TEXTOS.es[clave]), []);
});

test('cada t("clave") literal del código existe en el diccionario', () => {
  const faltan = [];
  for (const archivo of readdirSync(carpeta).filter(nombre => nombre.endsWith('.js'))) {
    const fuente = readFileSync(new URL(archivo, carpeta), 'utf8').replace(/^\s*\/\/.*$/gm, '');
    for (const [, clave] of fuente.matchAll(/\bt\(\s*'([\w.]+)'/g)) {
      if (!TEXTOS.es[clave]) faltan.push(`${archivo}: ${clave}`);
    }
  }
  assert.deepEqual(faltan, []);
});

test('t sustituye variables y cambia de idioma', () => {
  setIdioma('en');
  assert.equal(t('aviso.copiado', { tecla: '⌘V' }), 'Copied. Paste with ⌘V');
  setIdioma('xx');
  assert.equal(t('aviso.copiado', { tecla: 'Ctrl+V' }), 'Copiado. Pega con Ctrl+V');
  assert.equal(existe('error.json_invalido'), true);
  assert.equal(existe('error.inventado'), false);
});
