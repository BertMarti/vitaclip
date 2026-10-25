import test from 'node:test';
import assert from 'node:assert/strict';
import { detectar, aHex, aRgb, aHsl } from '../src/js/herramientas/color.js';

test('detecta hexadecimales de 3, 4, 6 y 8 cifras', () => {
  assert.deepEqual(detectar('#1e90ff'), { r: 30, g: 144, b: 255, a: 1 });
  assert.deepEqual(detectar('#fff'), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(detectar('#0000'), { r: 0, g: 0, b: 0, a: 0 });
  assert.equal(detectar('#1e90ff80').a, 0.502);
});

test('detecta rgb() y rgba() con comas o espacios', () => {
  assert.deepEqual(detectar('rgb(1, 2, 3)'), { r: 1, g: 2, b: 3, a: 1 });
  assert.deepEqual(detectar('rgba(10,20,30,0.5)'), { r: 10, g: 20, b: 30, a: 0.5 });
  assert.deepEqual(detectar('rgb(10 20 30 / 50%)'), { r: 10, g: 20, b: 30, a: 0.5 });
});

test('detecta hsl() y hsla()', () => {
  assert.deepEqual(detectar('hsl(0, 100%, 50%)'), { r: 255, g: 0, b: 0, a: 1 });
  assert.deepEqual(detectar('hsla(120, 100%, 25%, 0.4)'), { r: 0, g: 128, b: 0, a: 0.4 });
});

test('recorta espacios y no confunde textos normales', () => {
  assert.deepEqual(detectar('  #abc  '), { r: 170, g: 187, b: 204, a: 1 });
  assert.equal(detectar('rojo'), null);
  assert.equal(detectar('el color es #fff'), null);
  assert.equal(detectar('#12345'), null);
});

test('convierte a HEX, RGB y HSL', () => {
  const azul = { r: 30, g: 144, b: 255, a: 1 };
  assert.equal(aHex(azul), '#1e90ff');
  assert.equal(aRgb(azul), 'rgb(30, 144, 255)');
  assert.equal(aHsl(azul), 'hsl(210, 100%, 56%)');
});

test('conserva la transparencia al convertir', () => {
  const medio = { r: 255, g: 0, b: 0, a: 0.5 };
  assert.equal(aHex(medio), '#ff000080');
  assert.equal(aRgb(medio), 'rgba(255, 0, 0, 0.5)');
  assert.equal(aHsl(medio), 'hsla(0, 100%, 50%, 0.5)');
});

test('grises sin tono', () => {
  assert.equal(aHsl({ r: 128, g: 128, b: 128, a: 1 }), 'hsl(0, 0%, 50%)');
});
