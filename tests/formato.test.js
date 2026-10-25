import test from 'node:test';
import assert from 'node:assert/strict';
import { tamanoLegible, duracion, fechaHora } from '../src/js/herramientas/formato.js';

test('tamaños de archivo legibles en español e inglés', () => {
  assert.equal(tamanoLegible(0), '0 B');
  assert.equal(tamanoLegible(512), '512 B');
  assert.equal(tamanoLegible(1536), '1,5 KB');
  assert.equal(tamanoLegible(1536, 'en'), '1.5 KB');
  assert.equal(tamanoLegible(250 * 1024), '250 KB');
  assert.equal(tamanoLegible(3.46 * 1024 * 1024), '3,5 MB');
  assert.equal(tamanoLegible(1.2 * 1024 ** 3, 'en'), '1.2 GB');
  assert.equal(tamanoLegible(-1), '—');
  assert.equal(tamanoLegible('x'), '—');
});

test('duraciones mm:ss y h:mm:ss', () => {
  assert.equal(duracion(0), '00:00');
  assert.equal(duracion(9.8), '00:09');
  assert.equal(duracion(75), '01:15');
  assert.equal(duracion(3599), '59:59');
  assert.equal(duracion(3723), '1:02:03');
  assert.equal(duracion(-5), '00:00');
  assert.equal(duracion(undefined), '00:00');
});

test('fecha y hora locales', () => {
  const marca = new Date(2026, 9, 25, 14, 3).getTime();
  assert.equal(fechaHora(marca), '25/10/2026 14:03');
  assert.equal(fechaHora(marca, 'en'), '2026-10-25 14:03');
  assert.equal(fechaHora('nada'), '—');
});
