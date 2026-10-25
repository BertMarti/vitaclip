import test from 'node:test';
import assert from 'node:assert/strict';
import { aplicarAccion, pasoVacio, TIPOS_PASO } from '../src/js/herramientas/acciones.js';

const telefono = {
  nombre: 'Teléfono bonito',
  pasos: [
    { tipo: 'regex', buscar: '\\D', reemplazar: '' },
    { tipo: 'regex', buscar: '^(\\d{3})(\\d{3})(\\d{3})$', reemplazar: '$1 $2 $3', flags: '' },
    { tipo: 'prefijo', texto: '+34 ' },
  ],
};

test('el ejemplo de la guía: teléfono bonito', () => {
  assert.equal(aplicarAccion(telefono, '612-345-678'), '+34 612 345 678');
});

test('prefijo, sufijo y regex encadenados en orden', () => {
  const accion = { pasos: [{ tipo: 'prefijo', texto: '[' }, { tipo: 'sufijo', texto: ']' }, { tipo: 'regex', buscar: 'a', reemplazar: 'b' }] };
  assert.equal(aplicarAccion(accion, 'ana'), '[bnb]');
});

test('paso de transformación', () => {
  assert.equal(aplicarAccion({ pasos: [{ tipo: 'transformar', id: 'mayusculas' }] }, 'hola'), 'HOLA');
});

test('flags por defecto g y flags propios', () => {
  assert.equal(aplicarAccion({ pasos: [{ tipo: 'regex', buscar: 'a', reemplazar: 'o' }] }, 'aaa'), 'ooo');
  assert.equal(aplicarAccion({ pasos: [{ tipo: 'regex', buscar: 'A', reemplazar: 'o', flags: 'gi' }] }, 'aA'), 'oo');
});

test('regex inválida lanza regex_invalida', () => {
  assert.throws(() => aplicarAccion({ pasos: [{ tipo: 'regex', buscar: '[' }] }, 'x'), { message: 'regex_invalida' });
  assert.throws(() => aplicarAccion({ pasos: [{ tipo: 'regex', buscar: 'a', flags: 'zz' }] }, 'x'), { message: 'regex_invalida' });
});

test('sin pasos o con pasos desconocidos devuelve el texto', () => {
  assert.equal(aplicarAccion({ pasos: [] }, 'igual'), 'igual');
  assert.equal(aplicarAccion({}, 'igual'), 'igual');
  assert.equal(aplicarAccion({ pasos: [{ tipo: 'otro' }] }, 'igual'), 'igual');
});

test('pasos vacíos para el editor', () => {
  assert.deepEqual(TIPOS_PASO, ['regex', 'transformar', 'prefijo', 'sufijo']);
  assert.deepEqual(pasoVacio('regex'), { tipo: 'regex', buscar: '', reemplazar: '', flags: 'g' });
  assert.deepEqual(pasoVacio('sufijo'), { tipo: 'sufijo', texto: '' });
});
