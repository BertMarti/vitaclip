import test from 'node:test';
import assert from 'node:assert/strict';
import { transformar, TRANSFORMACIONES, contar } from '../src/js/herramientas/transformar.js';

test('expone las 22 transformaciones con id y clave únicos', () => {
  assert.equal(TRANSFORMACIONES.length, 22);
  assert.equal(new Set(TRANSFORMACIONES.map(item => item.id)).size, 22);
  assert.ok(TRANSFORMACIONES.every(item => item.clave.startsWith('transformar.')));
});

test('todas las transformaciones aceptan texto vacío', () => {
  const sinEntrada = ['json_bonito', 'json_compacto'];
  for (const { id } of TRANSFORMACIONES.filter(item => !sinEntrada.includes(item.id))) {
    assert.equal(typeof transformar(id, ''), 'string', id);
  }
});

test('mayúsculas y minúsculas con eñes y tildes', () => {
  assert.equal(transformar('mayusculas', 'año árbol'), 'AÑO ÁRBOL');
  assert.equal(transformar('minusculas', 'ÁRBOL ÑU'), 'árbol ñu');
});

test('tipo título y tipo oración', () => {
  assert.equal(transformar('titulo', 'hola-mundo cruel'), 'Hola-Mundo Cruel');
  assert.equal(transformar('oracion', 'HOLA. ¿QUÉ TAL? bien'), 'Hola. ¿Qué tal? Bien');
});

test('camelCase, snake_case y kebab-case parten por espacios, guiones y mayúsculas', () => {
  assert.equal(transformar('camel', 'hola mundo feliz'), 'holaMundoFeliz');
  assert.equal(transformar('camel', 'nombre_de-usuario'), 'nombreDeUsuario');
  assert.equal(transformar('snake', 'nombreDeUsuario'), 'nombre_de_usuario');
  assert.equal(transformar('kebab', 'Hola  Mundo'), 'hola-mundo');
});

test('quitar espacios recorta y colapsa por línea', () => {
  assert.equal(transformar('espacios', '  a   b  \n   c  d '), 'a b\nc d');
});

test('una sola línea junta todo con un espacio', () => {
  assert.equal(transformar('una_linea', ' uno\n\n dos\ttres '), 'uno dos tres');
  assert.equal(transformar('una_linea', 'a\nb\n c'), 'a b c');
});

test('ordenar líneas con criterio español', () => {
  assert.equal(transformar('ordenar', 'ñu\nnube\noso\nárbol'), 'árbol\nnube\nñu\noso');
});

test('quitar líneas repetidas conserva el primer orden', () => {
  assert.equal(transformar('sin_duplicados', 'b\na\nb\nc\na'), 'b\na\nc');
});

test('invertir respeta los emojis', () => {
  assert.equal(transformar('invertir', 'a😀b'), 'b😀a');
});

test('JSON bonito usa 2 espacios y compacto quita espacios', () => {
  assert.equal(transformar('json_bonito', '{"a":1,"b":[1,2]}'), '{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}');
  assert.equal(transformar('json_compacto', '{ "a" : 1 }'), '{"a":1}');
});

test('JSON inválido lanza json_invalido', () => {
  assert.throws(() => transformar('json_bonito', '{a:1}'), { message: 'json_invalido' });
  assert.throws(() => transformar('json_compacto', ''), { message: 'json_invalido' });
});

test('Base64 ida y vuelta en UTF-8', () => {
  assert.equal(transformar('b64_cod', 'ñ'), 'w7E=');
  assert.equal(transformar('b64_dec', 'w7E='), 'ñ');
  assert.equal(transformar('b64_dec', transformar('b64_cod', 'Hola 👋 mundo')), 'Hola 👋 mundo');
});

test('Base64 inválido lanza base64_invalido', () => {
  assert.throws(() => transformar('b64_dec', '???'), { message: 'base64_invalido' });
  assert.throws(() => transformar('b64_dec', '/w=='), { message: 'base64_invalido' });
});

test('URL codificar y decodificar', () => {
  assert.equal(transformar('url_cod', 'a b&c=ñ'), 'a%20b%26c%3D%C3%B1');
  assert.equal(transformar('url_dec', 'a%20b+c'), 'a b c');
  assert.throws(() => transformar('url_dec', '%E0%A4%A'), { message: 'url_invalida' });
});

test('slug y quitar tildes (conserva la ñ)', () => {
  assert.equal(transformar('slug', '¡Árbol, café y ñandú!'), 'arbol-cafe-y-nandu');
  assert.equal(transformar('sin_tildes', 'Canción ÑANDÚ pingüino'), 'Cancion ÑANDU pinguino');
});

test('escapar y desescapar HTML sin crear entidades dobles', () => {
  assert.equal(transformar('html_esc', '<a href="x">Tom & \'Jerry\'</a>'), '&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;');
  assert.equal(transformar('html_desesc', '&amp;lt;b&amp;gt;'), '&lt;b&gt;');
  assert.equal(transformar('html_desesc', transformar('html_esc', '<p>"a" & b</p>')), '<p>"a" & b</p>');
});

test('una transformación desconocida lanza transformacion_invalida', () => {
  assert.throws(() => transformar('nada', 'x'), { message: 'transformacion_invalida' });
});

test('contar caracteres, palabras y líneas', () => {
  assert.deepEqual(contar('uno dos\ntres'), { caracteres: 12, palabras: 3, lineas: 2 });
  assert.deepEqual(contar(''), { caracteres: 0, palabras: 0, lineas: 0 });
  assert.deepEqual(contar('😀 a'), { caracteres: 3, palabras: 2, lineas: 1 });
});
