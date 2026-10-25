// Calculadora con analizador descendente propio. Nunca usa eval ni Function.
// Gramática:
//   suma     := producto (('+' | '-') producto)*
//   producto := unario ('%')* (('*' | '/') unario ('%')*)*
//   unario   := ('-' | '+') unario | potencia
//   potencia := primario ('^' unario)?        (asociativa a la derecha)
//   primario := número | '(' suma ')'

export function esCalculo(consulta) {
  return String(consulta ?? '').trimStart().startsWith('=');
}

function fallo() {
  throw new Error('calculo_invalido');
}

function crearLector(fuente) {
  let posicion = 0;
  return {
    saltarEspacios() {
      while (/\s/.test(fuente[posicion] || '')) {
        posicion += 1;
      }
    },
    mirar() {
      this.saltarEspacios();
      return fuente[posicion];
    },
    avanzar() {
      posicion += 1;
    },
    numero() {
      this.saltarEspacios();
      const coincidencia = fuente.slice(posicion).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
      if (!coincidencia) {
        fallo();
      }
      posicion += coincidencia[0].length;
      return Number(coincidencia[0]);
    },
    alFinal() {
      this.saltarEspacios();
      return posicion >= fuente.length;
    },
  };
}

function primario(lector) {
  if (lector.mirar() !== '(') {
    return lector.numero();
  }
  lector.avanzar();
  const valor = suma(lector);
  if (lector.mirar() !== ')') {
    fallo();
  }
  lector.avanzar();
  return valor;
}

function potencia(lector) {
  const base = primario(lector);
  if (lector.mirar() !== '^') {
    return base;
  }
  lector.avanzar();
  return base ** unario(lector);
}

function unario(lector) {
  const signo = lector.mirar();
  if (signo === '-' || signo === '+') {
    lector.avanzar();
    const valor = unario(lector);
    return signo === '-' ? -valor : valor;
  }
  return potencia(lector);
}

function conPorcentaje(lector) {
  let valor = unario(lector);
  while (lector.mirar() === '%') {
    lector.avanzar();
    valor /= 100;
  }
  return valor;
}

function producto(lector) {
  let resultado = conPorcentaje(lector);
  for (;;) {
    const operador = lector.mirar();
    if (operador !== '*' && operador !== '/') {
      return resultado;
    }
    lector.avanzar();
    const siguiente = conPorcentaje(lector);
    if (operador === '/' && siguiente === 0) {
      throw new Error('division_cero');
    }
    resultado = operador === '*' ? resultado * siguiente : resultado / siguiente;
  }
}

function suma(lector) {
  let resultado = producto(lector);
  for (;;) {
    const operador = lector.mirar();
    if (operador !== '+' && operador !== '-') {
      return resultado;
    }
    lector.avanzar();
    const siguiente = producto(lector);
    resultado = operador === '+' ? resultado + siguiente : resultado - siguiente;
  }
}

export function calcular(expresion) {
  const fuente = String(expresion ?? '')
    .trim()
    .replace(/^=/, '')
    .replace(/,/g, '.')
    .replace(/[×x]/g, '*')
    .replace(/÷/g, '/');
  const lector = crearLector(fuente);
  if (lector.alFinal()) {
    fallo();
  }
  const resultado = suma(lector);
  if (!lector.alFinal() || !Number.isFinite(resultado)) {
    fallo();
  }
  return resultado;
}

export function formatear(numero, idioma = 'es') {
  const limpio = Object.is(numero, -0) ? 0 : numero;
  return limpio.toLocaleString(idioma === 'en' ? 'en-US' : 'es-ES', {
    maximumFractionDigits: 10,
    useGrouping: false,
  });
}
