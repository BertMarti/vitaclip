// Acciones personalizadas (Pro): cadenas de pasos aplicadas a un texto.
//   {tipo: "regex", buscar, reemplazar, flags = "g"}
//   {tipo: "transformar", id}
//   {tipo: "prefijo", texto} · {tipo: "sufijo", texto}

import { transformar } from './transformar.js';

export const TIPOS_PASO = ['regex', 'transformar', 'prefijo', 'sufijo'];

export function pasoVacio(tipo) {
  switch (tipo) {
    case 'regex': return { tipo, buscar: '', reemplazar: '', flags: 'g' };
    case 'transformar': return { tipo, id: 'mayusculas' };
    default: return { tipo, texto: '' };
  }
}

function aplicarRegex(paso, texto) {
  let expresion;
  try {
    expresion = new RegExp(paso.buscar ?? '', paso.flags ?? 'g');
  } catch {
    throw new Error('regex_invalida');
  }
  return texto.replace(expresion, paso.reemplazar ?? '');
}

function aplicarPaso(texto, paso) {
  switch (paso?.tipo) {
    case 'regex': return aplicarRegex(paso, texto);
    case 'transformar': return transformar(paso.id, texto);
    case 'prefijo': return `${paso.texto ?? ''}${texto}`;
    case 'sufijo': return `${texto}${paso.texto ?? ''}`;
    default: return texto;
  }
}

export function aplicarAccion(accion, texto) {
  const pasos = Array.isArray(accion?.pasos) ? accion.pasos : [];
  return pasos.reduce(aplicarPaso, String(texto ?? ''));
}
