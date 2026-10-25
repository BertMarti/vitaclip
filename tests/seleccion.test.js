import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizar, limitar, esValida, contiene, centrosAsas, asaEn, mover, redimensionar,
  aFisicos, posicionBarra, posicionEtiqueta, ASAS,
} from '../src/js/herramientas/seleccion.js';

const pantalla = { ancho: 1280, alto: 800 };

test('normalizar da el mismo rectángulo se arrastre hacia donde se arrastre', () => {
  const esperado = { x: 100, y: 50, ancho: 200, alto: 150 };
  assert.deepEqual(normalizar(100, 50, 300, 200), esperado);
  assert.deepEqual(normalizar(300, 200, 100, 50), esperado);
  assert.deepEqual(normalizar(300, 50, 100, 200), esperado);
  assert.deepEqual(normalizar(100, 200, 300, 50), esperado);
});

test('limitar recorta al borde de la pantalla', () => {
  assert.deepEqual(limitar({ x: -20, y: -10, ancho: 100, alto: 50 }, pantalla), { x: 0, y: 0, ancho: 80, alto: 40 });
  assert.deepEqual(limitar({ x: 1200, y: 780, ancho: 200, alto: 100 }, pantalla), { x: 1200, y: 780, ancho: 80, alto: 20 });
  assert.deepEqual(limitar({ x: 10, y: 10, ancho: 5, alto: 5 }, pantalla), { x: 10, y: 10, ancho: 5, alto: 5 });
});

test('validez y contención', () => {
  assert.equal(esValida(null), false);
  assert.equal(esValida({ x: 0, y: 0, ancho: 2, alto: 40 }), false);
  assert.equal(esValida({ x: 0, y: 0, ancho: 3, alto: 3 }), true);
  assert.equal(contiene({ x: 10, y: 10, ancho: 10, alto: 10 }, 20, 15), true);
  assert.equal(contiene({ x: 10, y: 10, ancho: 10, alto: 10 }, 21, 15), false);
});

test('las 8 asas están en esquinas y puntos medios', () => {
  const rect = { x: 10, y: 20, ancho: 100, alto: 40 };
  const centros = centrosAsas(rect);
  assert.deepEqual(Object.keys(centros).sort(), [...ASAS].sort());
  assert.deepEqual(centros.nw, { x: 10, y: 20 });
  assert.deepEqual(centros.e, { x: 110, y: 40 });
  assert.deepEqual(centros.s, { x: 60, y: 60 });
  assert.equal(asaEn(rect, 112, 58), 'se');
  assert.equal(asaEn(rect, 60, 21), 'n');
  assert.equal(asaEn(rect, 60, 40), null);
  assert.equal(asaEn(null, 0, 0), null);
});

test('mover conserva el tamaño y no se sale', () => {
  const rect = { x: 100, y: 100, ancho: 200, alto: 100 };
  assert.deepEqual(mover(rect, 50, -20, pantalla), { x: 150, y: 80, ancho: 200, alto: 100 });
  assert.deepEqual(mover(rect, -500, -500, pantalla), { x: 0, y: 0, ancho: 200, alto: 100 });
  assert.deepEqual(mover(rect, 5000, 5000, pantalla), { x: 1080, y: 700, ancho: 200, alto: 100 });
});

test('redimensionar con asas, dándose la vuelta y sin salirse', () => {
  const inicial = { x: 100, y: 100, ancho: 200, alto: 100 };
  assert.deepEqual(redimensionar(inicial, 'se', 400, 250, pantalla), { x: 100, y: 100, ancho: 300, alto: 150 });
  assert.deepEqual(redimensionar(inicial, 'e', 350, 999, pantalla), { x: 100, y: 100, ancho: 250, alto: 100 });
  assert.deepEqual(redimensionar(inicial, 'n', 0, 150, pantalla), { x: 100, y: 150, ancho: 200, alto: 50 });
  // El asa izquierda cruza el lado derecho: la selección se da la vuelta.
  assert.deepEqual(redimensionar(inicial, 'w', 350, 0, pantalla), { x: 300, y: 100, ancho: 50, alto: 100 });
  assert.deepEqual(redimensionar(inicial, 'nw', -50, -50, pantalla), { x: 0, y: 0, ancho: 300, alto: 200 });
});

test('a píxeles físicos: escala y redondea los bordes', () => {
  assert.deepEqual(aFisicos({ x: 10, y: 20, ancho: 100, alto: 50 }, 2), { x: 20, y: 40, ancho: 200, alto: 100 });
  // Escala 1,25 (Windows al 125 %): 10,4 → 13; 10,4 + 33,3 = 43,7 → 54,625 → 55.
  assert.deepEqual(aFisicos({ x: 10.4, y: 0, ancho: 33.3, alto: 10 }, 1.25), { x: 13, y: 0, ancho: 42, alto: 13 });
  assert.deepEqual(aFisicos({ x: 0, y: 0, ancho: 640, alto: 400 }, 3, 2.7), { x: 0, y: 0, ancho: 1920, alto: 1080 });
  assert.deepEqual(aFisicos({ x: 630, y: 0, ancho: 20, alto: 10 }, 2, 2, { ancho: 1280, alto: 800 }), { x: 1260, y: 0, ancho: 20, alto: 20 });
});

test('la barra va debajo; si no cabe, encima; si tampoco, dentro', () => {
  const barra = { ancho: 300, alto: 36 };
  assert.deepEqual(posicionBarra({ x: 100, y: 100, ancho: 400, alto: 200 }, barra, pantalla), { x: 200, y: 308, lugar: 'debajo' });
  assert.deepEqual(posicionBarra({ x: 100, y: 500, ancho: 400, alto: 290 }, barra, pantalla), { x: 200, y: 456, lugar: 'encima' });
  const llena = posicionBarra({ x: 0, y: 0, ancho: 1280, alto: 800 }, barra, pantalla);
  assert.equal(llena.lugar, 'dentro');
  assert.equal(llena.y, 800 - 36 - 8);
  assert.equal(llena.x, 1280 - 300 - 8);
  // Selección estrecha en el borde izquierdo: la barra no se sale.
  assert.equal(posicionBarra({ x: 0, y: 100, ancho: 50, alto: 50 }, barra, pantalla).x, 8);
});

test('la etiqueta de tamaño va encima o, si no cabe, dentro', () => {
  assert.deepEqual(posicionEtiqueta({ x: 50, y: 100, ancho: 10, alto: 10 }, { ancho: 80, alto: 20 }), { x: 50, y: 74, dentro: false });
  assert.deepEqual(posicionEtiqueta({ x: 50, y: 10, ancho: 10, alto: 10 }, { ancho: 80, alto: 20 }), { x: 56, y: 16, dentro: true });
});
