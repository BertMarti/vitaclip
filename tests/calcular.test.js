import test from 'node:test';
import assert from 'node:assert/strict';
import { calcular, esCalculo, formatear } from '../src/js/herramientas/calcular.js';

test('esCalculo detecta el = inicial', () => {
  assert.equal(esCalculo('=2+2'), true);
  assert.equal(esCalculo('  =2'), true);
  assert.equal(esCalculo('2+2'), false);
  assert.equal(esCalculo(''), false);
});

test('precedencia de operadores', () => {
  assert.equal(calcular('2+3*4'), 14);
  assert.equal(calcular('10-4-3'), 3);
  assert.equal(calcular('8/4/2'), 1);
});

test('potencia asociativa a la derecha', () => {
  assert.equal(calcular('2^3^2'), 512);
  assert.equal(calcular('2^-1'), 0.5);
  assert.equal(calcular('-2^2'), -4);
});

test('paréntesis y menos unario', () => {
  assert.equal(calcular('(3+4)^2/7'), 7);
  assert.equal(calcular('-(2+3)'), -5);
  assert.equal(calcular('--3'), 3);
});

test('porcentaje postfijo', () => {
  assert.equal(calcular('200*15%'), 30);
  assert.equal(calcular('50%'), 0.5);
});

test('decimales con coma o punto y el = opcional', () => {
  assert.equal(formatear(calcular('=21*1,21'), 'es'), '25,41');
  assert.equal(calcular('(1,5 + 2) * 2'), 7);
  assert.equal(calcular('.5+.25'), 0.75);
});

test('errores de sintaxis lanzan calculo_invalido', () => {
  for (const expresion of ['1+', '(1+2', '2 3', '', '=', 'abc', '2**3']) {
    assert.throws(() => calcular(expresion), { message: 'calculo_invalido' }, expresion);
  }
});

test('dividir entre cero lanza division_cero', () => {
  assert.throws(() => calcular('1/0'), { message: 'division_cero' });
  assert.throws(() => calcular('5/(2-2)'), { message: 'division_cero' });
});

test('no ejecuta código', () => {
  assert.throws(() => calcular('alert(1)'), { message: 'calculo_invalido' });
  assert.throws(() => calcular('constructor'), { message: 'calculo_invalido' });
});

test('formatear quita ceros sobrantes y usa coma en español', () => {
  assert.equal(formatear(2.5, 'es'), '2,5');
  assert.equal(formatear(2.5, 'en'), '2.5');
  assert.equal(formatear(0.1 + 0.2, 'es'), '0,3');
  assert.equal(formatear(1234567, 'es'), '1234567');
  assert.equal(formatear(-0, 'es'), '0');
});
