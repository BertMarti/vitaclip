// Generadores puros: UUID v4, contraseñas, fechas y texto de relleno.

const MINUSCULAS = 'abcdefghijklmnopqrstuvwxyz';
const MAYUSCULAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITOS = '0123456789';
const SIMBOLOS = '!@#$%^&*()-_=+[]{}';

const PALABRAS_LOREM = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do',
  'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua', 'enim',
  'ad', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip',
  'ex', 'ea', 'commodo', 'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
];

// Entero aleatorio en [0, max) sin sesgo de módulo (muestreo por rechazo).
export function aleatorio(max) {
  const caja = new Uint32Array(1);
  const limite = Math.floor(0x100000000 / max) * max;
  do {
    crypto.getRandomValues(caja);
  } while (caja[0] >= limite);
  return caja[0] % max;
}

export function uuid() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function barajar(lista) {
  for (let i = lista.length - 1; i > 0; i -= 1) {
    const j = aleatorio(i + 1);
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
}

function elegir(alfabeto) {
  return alfabeto[aleatorio(alfabeto.length)];
}

export function contrasena(longitud = 20, { simbolos = true } = {}) {
  const grupos = [MINUSCULAS, MAYUSCULAS, DIGITOS];
  if (simbolos) {
    grupos.push(SIMBOLOS);
  }
  if (!Number.isInteger(longitud) || longitud < grupos.length || longitud > 1024) {
    throw new Error('longitud_invalida');
  }
  const todos = grupos.join('');
  // Al menos un carácter de cada grupo; el resto, de todos.
  const caracteres = grupos.map(elegir);
  while (caracteres.length < longitud) {
    caracteres.push(elegir(todos));
  }
  return barajar(caracteres).join('');
}

export function fechaIso(fecha = new Date()) {
  return fecha.toISOString();
}

export function marcaUnix(fecha = new Date()) {
  return Math.floor(fecha.getTime() / 1000);
}

export function lorem(palabras = 40) {
  const cantidad = Math.max(1, Math.floor(palabras));
  const salida = [];
  for (let i = 0; i < cantidad; i += 1) {
    salida.push(PALABRAS_LOREM[i % PALABRAS_LOREM.length]);
  }
  salida[0] = salida[0].charAt(0).toUpperCase() + salida[0].slice(1);
  return `${salida.join(' ')}.`;
}
