import test from 'node:test';
import assert from 'node:assert/strict';
import { resaltar, vistaPrevia, haceCuanto, coincide, terminos, esUrl } from '../src/js/herramientas/buscar.js';

test('resaltar sin distinguir tildes ni mayúsculas', () => {
  assert.deepEqual(resaltar('Árbol verde', 'arbol'), [
    { texto: 'Árbol', marcado: true },
    { texto: ' verde', marcado: false },
  ]);
});

test('resaltar varias palabras', () => {
  const partes = resaltar('uno dos tres', 'tres uno');
  assert.deepEqual(partes.filter(parte => parte.marcado).map(parte => parte.texto), ['uno', 'tres']);
});

test('resaltar ignora los prefijos de filtro', () => {
  assert.deepEqual(resaltar('https://example.com', 'url:'), [{ texto: 'https://example.com', marcado: false }]);
  assert.equal(resaltar('ana@example.com', 'fij: ana')[0].texto, 'ana');
});

test('resaltar escapa caracteres de regex', () => {
  const marcados = resaltar('a+b (c)', '+b (').filter(parte => parte.marcado).map(parte => parte.texto);
  assert.deepEqual(marcados, ['+b', '(']);
});

test('terminos y coincide', () => {
  assert.deepEqual(terminos('img: gato  negro'), ['gato', 'negro']);
  assert.equal(coincide('Reunión en el Ágora', 'agora reunion'), true);
  assert.equal(coincide('Reunión', 'reunion lunes'), false);
});

test('vista previa colapsa espacios y corta con puntos suspensivos', () => {
  assert.equal(vistaPrevia('  uno \n  dos  ', 20), 'uno dos');
  assert.equal(vistaPrevia('abcdefghij', 5), 'abcd…');
  assert.equal(vistaPrevia('😀😀😀', 2), '😀…');
});

test('hace cuánto en español e inglés', () => {
  const ahora = Date.UTC(2026, 9, 24, 12);
  assert.equal(haceCuanto(ahora - 10_000, ahora), 'ahora');
  assert.equal(haceCuanto(ahora - 5 * 60_000, ahora), 'hace 5 min');
  assert.equal(haceCuanto(ahora - 3_600_000, ahora), 'hace 1 h');
  assert.equal(haceCuanto(ahora - 30 * 3_600_000, ahora), 'ayer');
  assert.equal(haceCuanto(ahora - 3 * 86_400_000, ahora), 'hace 3 d');
  assert.equal(haceCuanto(ahora - 5 * 60_000, ahora, 'en'), '5 min ago');
});

test('esUrl', () => {
  assert.equal(esUrl('https://github.com/BertMarti/vitaclip'), true);
  assert.equal(esUrl('www.example.com'), true);
  assert.equal(esUrl('hola https://x.com'), false);
});
