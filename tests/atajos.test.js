import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ATAJOS_DEFECTO, ACCIONES_ATAJO, atajoDeEvento, atajoLegible, nombreTecla, partesLegibles,
  normalizarAtajo, completarAtajos, quienUsa, duplicados, atajosLegibles,
} from '../src/js/atajos.js';

const evento = (code, mods = {}) => ({ code, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...mods });

test('las sugerencias son Ctrl+Alt+V, Ctrl+Alt+C y Ctrl+Alt+R', () => {
  assert.deepEqual(ACCIONES_ATAJO, ['popup', 'captura', 'video']);
  assert.equal(ATAJOS_DEFECTO.popup, 'CommandOrControl+Alt+KeyV');
  assert.equal(atajoLegible(ATAJOS_DEFECTO.captura), 'Ctrl+Alt+C');
  assert.equal(atajoLegible(ATAJOS_DEFECTO.video, { mac: true }), '⌘⌥R');
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

test('partes legibles para pintar teclas sueltas; vacío = desactivado', () => {
  assert.deepEqual(partesLegibles('Shift+CommandOrControl+Space', { mac: true }), ['⌘', '⇧', 'Espacio']);
  assert.equal(atajoLegible('Alt+Shift+Digit1', { idioma: 'en' }), 'Alt+Shift+1');
  assert.deepEqual(partesLegibles(''), []);
  assert.equal(atajoLegible(''), '');
  assert.equal(atajoLegible(null), '');
});

test('normalizar ignora el orden de los modificadores', () => {
  assert.equal(normalizarAtajo('Shift+Alt+CommandOrControl+KeyX'), 'CommandOrControl+Alt+Shift+KeyX');
  assert.equal(normalizarAtajo(''), '');
});

test('completar respeta los desactivados y rellena lo que falta', () => {
  assert.deepEqual(completarAtajos(undefined), { ...ATAJOS_DEFECTO });
  assert.deepEqual(completarAtajos({ popup: '', video: 'Alt+F9' }), {
    popup: '',
    captura: ATAJOS_DEFECTO.captura,
    video: 'Alt+F9',
  });
});

test('quién usa un atajo, sin contar la propia acción ni los vacíos', () => {
  const atajos = { popup: 'CommandOrControl+Alt+KeyV', captura: '', video: 'Alt+CommandOrControl+KeyR' };
  assert.equal(quienUsa(atajos, 'Alt+CommandOrControl+KeyV', 'captura'), 'popup');
  assert.equal(quienUsa(atajos, 'CommandOrControl+Alt+KeyV', 'popup'), null);
  assert.equal(quienUsa(atajos, 'CommandOrControl+Alt+KeyR'), 'video');
  assert.equal(quienUsa(atajos, ''), null);
});

test('duplicados encuentra parejas con la misma combinación', () => {
  assert.deepEqual(duplicados(ATAJOS_DEFECTO), []);
  assert.deepEqual(duplicados({ popup: 'Alt+KeyA', captura: 'Alt+KeyB', video: 'Alt+KeyA' }), [['popup', 'video']]);
  assert.deepEqual(duplicados({ popup: '', captura: '', video: '' }), []);
  assert.equal(duplicados({ popup: 'Alt+KeyA', captura: 'Alt+KeyA', video: 'Alt+KeyA' }).length, 3);
});

test('legibles de los tres a la vez', () => {
  assert.deepEqual(atajosLegibles({ popup: 'CommandOrControl+Alt+KeyV', captura: '', video: 'Alt+F9' }), {
    popup: 'Ctrl+Alt+V',
    captura: '',
    video: 'Alt+F9',
  });
  assert.deepEqual(atajosLegibles(ATAJOS_DEFECTO, { mac: true }), { popup: '⌘⌥V', captura: '⌘⌥C', video: '⌘⌥R' });
});
