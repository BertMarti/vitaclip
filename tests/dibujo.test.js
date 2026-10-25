import test from 'node:test';
import assert from 'node:assert/strict';
import {
  puntaFlecha, rectDeAnotacion, escalarAnotacion, esUtil, tamanoTexto, anchoMarcador, grosorPara,
  HERRAMIENTAS, COLORES, GROSORES,
} from '../src/js/herramientas/dibujo.js';

const cerca = (real, esperado) => assert.ok(Math.abs(real - esperado) < 1e-9, `${real} ≠ ${esperado}`);

test('herramientas, 6 colores y 3 grosores', () => {
  assert.deepEqual(HERRAMIENTAS, ['lapiz', 'linea', 'flecha', 'rectangulo', 'marcador', 'texto']);
  assert.equal(COLORES.length, 6);
  assert.equal(GROSORES.length, 3);
});

test('punta de flecha horizontal: simétrica y hacia atrás', () => {
  const { punta, izquierda, derecha } = puntaFlecha(0, 0, 100, 0, 4);
  assert.deepEqual(punta, [100, 0]);
  assert.ok(izquierda[0] < 100 && derecha[0] < 100);
  cerca(izquierda[0], derecha[0]);
  cerca(izquierda[1], -derecha[1]);
  // Cada lado mide grosor × 4 = 16.
  cerca(Math.hypot(100 - izquierda[0], izquierda[1]), 16);
});

test('punta de flecha vertical hacia arriba y flechas cortas', () => {
  const { izquierda, derecha } = puntaFlecha(50, 100, 50, 0, 2);
  assert.ok(izquierda[1] > 0 && derecha[1] > 0);
  cerca(izquierda[0] - 50, 50 - derecha[0]);
  // Mínimo 10 px de punta, pero nunca más larga que la propia flecha.
  const corta = puntaFlecha(0, 0, 6, 0, 2);
  cerca(Math.hypot(6 - corta.izquierda[0], corta.izquierda[1]), 6);
  assert.equal(puntaFlecha(5, 5, 5, 5), null);
  // Al exportar al doble, el mínimo también se dobla.
  const doble = puntaFlecha(0, 0, 200, 0, 4, 20);
  cerca(Math.hypot(200 - doble.izquierda[0], doble.izquierda[1]), 20);
});

test('rectángulos normalizados aunque se dibujen al revés', () => {
  assert.deepEqual(rectDeAnotacion({ x1: 50, y1: 80, x2: 10, y2: 20 }), { x: 10, y: 20, ancho: 40, alto: 60 });
});

test('escalado de trazos al recorte en píxeles físicos', () => {
  const origen = { x: 100, y: 50 };
  const linea = escalarAnotacion({ tipo: 'flecha', x1: 100, y1: 50, x2: 150, y2: 100, color: '#fff', grosor: 4 }, origen, 2);
  assert.deepEqual([linea.x1, linea.y1, linea.x2, linea.y2, linea.grosor, linea.escala], [0, 0, 100, 100, 8, 2]);
  const lapiz = escalarAnotacion({ tipo: 'lapiz', puntos: [[110, 60], [120, 70]], color: '#000', grosor: 2 }, origen, 1.5, 2.5);
  assert.deepEqual(lapiz.puntos, [[15, 25], [30, 50]]);
  assert.equal(lapiz.grosor, 4);
  const texto = escalarAnotacion({ tipo: 'texto', x: 101, y: 52, texto: 'Hola', color: '#000', grosor: 4 }, origen, 2);
  assert.deepEqual([texto.x, texto.y, texto.texto, texto.grosor], [2, 4, 'Hola', 8]);
});

test('escalar no modifica la anotación original', () => {
  const original = { tipo: 'lapiz', puntos: [[1, 1]], color: '#000', grosor: 2 };
  escalarAnotacion(original, { x: 0, y: 0 }, 3);
  assert.deepEqual(original.puntos, [[1, 1]]);
  assert.equal(original.grosor, 2);
});

test('solo se guardan anotaciones útiles', () => {
  assert.equal(esUtil({ tipo: 'linea', x1: 1, y1: 1, x2: 1, y2: 1 }), false);
  assert.equal(esUtil({ tipo: 'flecha', x1: 1, y1: 1, x2: 20, y2: 1 }), true);
  assert.equal(esUtil({ tipo: 'rectangulo', x1: 1, y1: 1, x2: 20, y2: 1 }), false);
  assert.equal(esUtil({ tipo: 'lapiz', puntos: [[3, 3]] }), true);
  assert.equal(esUtil({ tipo: 'texto', texto: '   ' }), false);
});

test('tamaño de letra y del marcador crecen con el grosor', () => {
  assert.deepEqual(GROSORES.map(tamanoTexto), [17, 22, 32]);
  assert.deepEqual(GROSORES.map(anchoMarcador), [14, 22, 38]);
  assert.equal(grosorPara('marcador', 4), 22);
  assert.equal(grosorPara('texto', 2), 17);
  assert.equal(grosorPara('flecha', 8), 8);
});
