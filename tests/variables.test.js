import test from 'node:test';
import assert from 'node:assert/strict';
import { expandir, campos, rellenar, VARIABLES } from '../src/js/herramientas/variables.js';

const ahora = new Date(2026, 9, 24, 9, 5);

test('fecha y hora en español', () => {
  assert.equal(expandir('{fecha} {hora}', { ahora }).texto, '24/10/2026 09:05');
  assert.equal(expandir('{fecha_hora}', { ahora }).texto, '24/10/2026 09:05');
});

test('fecha en inglés con formato ISO', () => {
  assert.equal(expandir('{fecha}', { ahora, idioma: 'en' }).texto, '2026-10-24');
});

test('portapapeles y uuid', () => {
  assert.equal(expandir('Re: {portapapeles}', { portapapeles: 'hola' }).texto, 'Re: hola');
  assert.match(expandir('{uuid}').texto, /^[\da-f]{8}-[\da-f]{4}-4/);
});

test('cursor se quita y devuelve su posición en el texto final', () => {
  const resultado = expandir('Hola {portapapeles}, {cursor}adiós', { portapapeles: 'Ana' });
  assert.equal(resultado.texto, 'Hola Ana, adiós');
  assert.equal(resultado.cursor, 10);
  assert.equal(resultado.texto.slice(resultado.cursor), 'adiós');
});

test('sin cursor devuelve null y solo cuenta el primero', () => {
  assert.equal(expandir('nada').cursor, null);
  const resultado = expandir('a{cursor}b{cursor}c');
  assert.equal(resultado.texto, 'abc');
  assert.equal(resultado.cursor, 1);
});

test('deja tal cual las llaves desconocidas y los campos', () => {
  assert.equal(expandir('{otra} {campo:Nombre}').texto, '{otra} {campo:Nombre}');
});

test('campos sin repetir, con valor por defecto', () => {
  assert.deepEqual(campos('{campo:Nombre} {campo:Empresa|Acme} {campo:Nombre}'), [
    { nombre: 'Nombre', defecto: '' },
    { nombre: 'Empresa', defecto: 'Acme' },
  ]);
  assert.deepEqual(campos('sin campos'), []);
});

test('rellenar usa el valor o el defecto', () => {
  assert.equal(rellenar('{campo:Empresa|Acme}', { Empresa: 'Ana SL' }), 'Ana SL');
  assert.equal(rellenar('{campo:Empresa|Acme}', {}), 'Acme');
  assert.equal(rellenar('Hola {campo:Nombre}', {}), 'Hola ');
});

test('lista de variables disponibles', () => {
  assert.deepEqual(VARIABLES, ['fecha', 'hora', 'fecha_hora', 'portapapeles', 'uuid', 'cursor']);
});
