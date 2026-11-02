import test from 'node:test';
import assert from 'node:assert/strict';
import { ampliar, alternar, textosParaPegar } from '../src/js/herramientas/seleccion-lista.js';

test('ampliar devuelve el rango en ambos sentidos', () => {
  assert.deepEqual(ampliar([], 'b', 'd', ['a', 'b', 'c', 'd']), ['b', 'c', 'd']);
  assert.deepEqual(ampliar(['z'], 'd', 'b', ['a', 'b', 'c', 'd']), ['b', 'c', 'd']);
});

test('alternar añade y quita ids', () => {
  assert.deepEqual(alternar(['a'], 'b'), ['a', 'b']);
  assert.deepEqual(alternar(['a', 'b'], 'a'), ['b']);
});

test('textosParaPegar conserva el orden y salta imágenes', () => {
  const clips = [{ id: 2, tipo: 'imagen' }, { id: 1, tipo: 'texto', texto: 'uno' }, { id: 3, tipo: 'texto', texto: 'tres' }];
  assert.deepEqual(textosParaPegar(clips, [3, 2, 1]), { texto: 'uno\ntres', saltadas: 1 });
  assert.deepEqual(textosParaPegar(clips, [2]), { texto: '', saltadas: 1 });
});
