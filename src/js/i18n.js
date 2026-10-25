// Textos de la interfaz en español (por defecto) e inglés.
// t('clave', {variable}) sustituye {variable}. Toda cadena visible sale de aquí.

import { es } from './textos-es.js';
import { en } from './textos-en.js';

export const TEXTOS = { es, en };

let idioma = 'es';

export function setIdioma(nuevo) {
  idioma = TEXTOS[nuevo] ? nuevo : 'es';
  if (globalThis.document) {
    document.documentElement.lang = idioma;
  }
}

export function idiomaActual() {
  return idioma;
}

export function existe(clave) {
  return Object.hasOwn(TEXTOS[idioma], clave) || Object.hasOwn(es, clave);
}

export function t(clave, variables = {}) {
  const plantilla = TEXTOS[idioma][clave] ?? es[clave] ?? clave;
  return plantilla.replace(/\{(\w+)\}/g, (completo, nombre) => (
    Object.hasOwn(variables, nombre) ? String(variables[nombre]) : completo
  ));
}
