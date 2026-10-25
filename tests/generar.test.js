import test from 'node:test';
import assert from 'node:assert/strict';
import { uuid, contrasena, fechaIso, marcaUnix, lorem, aleatorio } from '../src/js/herramientas/generar.js';

test('uuid v4 con formato correcto y distinto cada vez', () => {
  const uno = uuid();
  assert.match(uno, /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
  assert.notEqual(uno, uuid());
});

test('contraseña con la longitud pedida y todos los grupos', () => {
  for (let i = 0; i < 20; i += 1) {
    const valor = contrasena(12);
    assert.equal(valor.length, 12);
    assert.match(valor, /[a-z]/);
    assert.match(valor, /[A-Z]/);
    assert.match(valor, /\d/);
    assert.match(valor, /[^a-zA-Z\d]/);
  }
});

test('contraseña sin símbolos', () => {
  const valor = contrasena(30, { simbolos: false });
  assert.equal(valor.length, 30);
  assert.match(valor, /^[a-zA-Z\d]+$/);
});

test('contraseña con longitud inválida lanza longitud_invalida', () => {
  assert.throws(() => contrasena(3), { message: 'longitud_invalida' });
  assert.throws(() => contrasena(2, { simbolos: false }), { message: 'longitud_invalida' });
  assert.throws(() => contrasena(10.5), { message: 'longitud_invalida' });
});

test('aleatorio siempre dentro del rango', () => {
  for (let i = 0; i < 500; i += 1) {
    const valor = aleatorio(7);
    assert.ok(valor >= 0 && valor < 7 && Number.isInteger(valor));
  }
});

test('fecha ISO y marca Unix', () => {
  const fecha = new Date('2026-01-02T00:00:00Z');
  assert.equal(fechaIso(fecha), '2026-01-02T00:00:00.000Z');
  assert.equal(marcaUnix(fecha), 1767312000);
  assert.equal(marcaUnix(new Date(1999)), 1);
});

test('lorem con el número de palabras pedido', () => {
  assert.equal(lorem(4), 'Lorem ipsum dolor sit.');
  assert.equal(lorem(100).split(' ').length, 100);
  assert.equal(lorem().split(' ').length, 40);
});
