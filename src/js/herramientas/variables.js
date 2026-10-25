// Variables de plantilla para los fragmentos.
//   {fecha} {hora} {fecha_hora} {portapapeles} {uuid} {cursor}
//   {campo:Nombre} y {campo:Empresa|Acme} (Pro: se piden en un mini formulario).

import { uuid } from './generar.js';

const PATRON_VARIABLE = /\{(fecha_hora|fecha|hora|portapapeles|uuid|cursor)\}/g;
const PATRON_CAMPO = /\{campo:([^}|]+)(?:\|([^}]*))?\}/g;

export const VARIABLES = ['fecha', 'hora', 'fecha_hora', 'portapapeles', 'uuid', 'cursor'];

function dos(numero) {
  return String(numero).padStart(2, '0');
}

function fechaLocal(ahora, idioma) {
  const ano = ahora.getFullYear();
  const mes = dos(ahora.getMonth() + 1);
  const dia = dos(ahora.getDate());
  return idioma === 'en' ? `${ano}-${mes}-${dia}` : `${dia}/${mes}/${ano}`;
}

function horaLocal(ahora) {
  return `${dos(ahora.getHours())}:${dos(ahora.getMinutes())}`;
}

function valorDe(nombre, contexto) {
  switch (nombre) {
    case 'fecha': return contexto.fecha;
    case 'hora': return contexto.hora;
    case 'fecha_hora': return `${contexto.fecha} ${contexto.hora}`;
    case 'portapapeles': return contexto.portapapeles;
    case 'uuid': return uuid();
    default: return '';
  }
}

// Devuelve el texto expandido y la posición del primer {cursor} (o null).
export function expandir(plantilla, opciones = {}) {
  const { portapapeles = '', ahora = new Date(), idioma = 'es' } = opciones;
  const contexto = {
    fecha: fechaLocal(ahora, idioma),
    hora: horaLocal(ahora),
    portapapeles: String(portapapeles ?? ''),
  };
  const fuente = String(plantilla ?? '');
  let texto = '';
  let cursor = null;
  let ultimo = 0;
  for (const coincidencia of fuente.matchAll(PATRON_VARIABLE)) {
    texto += fuente.slice(ultimo, coincidencia.index);
    ultimo = coincidencia.index + coincidencia[0].length;
    if (coincidencia[1] === 'cursor') {
      cursor ??= texto.length;
      continue;
    }
    texto += valorDe(coincidencia[1], contexto);
  }
  texto += fuente.slice(ultimo);
  return { texto, cursor };
}

// Lista de campos sin repetir, en orden de aparición.
export function campos(plantilla) {
  const vistos = new Set();
  const salida = [];
  for (const coincidencia of String(plantilla ?? '').matchAll(PATRON_CAMPO)) {
    const nombre = coincidencia[1].trim();
    if (!nombre || vistos.has(nombre)) {
      continue;
    }
    vistos.add(nombre);
    salida.push({ nombre, defecto: coincidencia[2] ?? '' });
  }
  return salida;
}

// Sustituye cada {campo:...} por su valor (o por el valor por defecto).
export function rellenar(plantilla, valores = {}) {
  return String(plantilla ?? '').replace(PATRON_CAMPO, (_, nombre, defecto) => {
    const clave = nombre.trim();
    return valores[clave] ?? defecto ?? '';
  });
}
