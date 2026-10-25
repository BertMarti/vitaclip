import test from 'node:test';
import assert from 'node:assert/strict';
import { ATAJO_DEFECTO, atajoDeEvento, atajoLegible, nombreTecla, partesLegibles } from '../src/js/atajos.js';

const evento = (code, mods = {}) => ({ code, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...mods });

test('la sugerencia por defecto es Ctrl+Alt+V', () => {
  assert.equal(ATAJO_DEFECTO, 'CommandOrControl+Alt+KeyV');
  assert.equal(atajoLegible(ATAJO_DEFECTO), 'Ctrl+Alt+V');
  assert.equal(atajoLegible(ATAJO_DEFECTO, { mac: true }), '⌘⌥V');
});

test('graba el código físico con los modificadores en orden', () => {
  assert.deepEqual(atajoDeEvento(evento('KeyV', { ctrlKey: true, altKey: true })), { atajo: 'CommandOrControl+Alt+KeyV' });
  assert.deepEqual(atajoDeEvento(evento('Semicolon', { metaKey: true, shiftKey: true })), { atajo: 'CommandOrControl+Shift+Semicolon' });
  assert.deepEqual(atajoDeEvento(evento('F12', { altKey: true })), { atajo: 'Alt+F12' });
});

test('exige un modificador y una tecla válida', () => {
  assert.deepEqual(atajoDeEvento(evento('KeyV')), { error: 'atajo_sin_modificador' });
  assert.deepEqual(atajoDeEvento(evento('Escape', { ctrlKey: true })), { error: 'atajo_tecla_invalida' });
  assert.deepEqual(atajoDeEvento(evento('ControlLeft', { ctrlKey: true })), { pendiente: true });
});

test('nombres legibles según el idioma', () => {
  assert.equal(nombreTecla('KeyV'), 'V');
  assert.equal(nombreTecla('Digit1'), '1');
  assert.equal(nombreTecla('Semicolon', 'es'), 'Ñ');
  assert.equal(nombreTecla('Semicolon', 'en'), ';');
  assert.equal(nombreTecla('Space', 'es'), 'Espacio');
  assert.equal(nombreTecla('Space', 'en'), 'Space');
});

test('partes legibles para pintar teclas sueltas', () => {
  assert.deepEqual(partesLegibles('Shift+CommandOrControl+Space', { mac: true }), ['⌘', '⇧', 'Espacio']);
  assert.equal(atajoLegible('Alt+Shift+Digit1', { idioma: 'en' }), 'Alt+Shift+1');
});
