// Transformaciones de texto puras (sin DOM ni Tauri).
// Cada una tiene un id estable y una clave de i18n para su nombre.

export const TRANSFORMACIONES = [
  ['mayusculas', 'transformar.mayusculas'],
  ['minusculas', 'transformar.minusculas'],
  ['titulo', 'transformar.titulo'],
  ['oracion', 'transformar.oracion'],
  ['camel', 'transformar.camel'],
  ['snake', 'transformar.snake'],
  ['kebab', 'transformar.kebab'],
  ['espacios', 'transformar.espacios'],
  ['una_linea', 'transformar.unaLinea'],
  ['ordenar', 'transformar.ordenar'],
  ['sin_duplicados', 'transformar.sinDuplicados'],
  ['invertir', 'transformar.invertir'],
  ['json_bonito', 'transformar.jsonBonito'],
  ['json_compacto', 'transformar.jsonCompacto'],
  ['b64_cod', 'transformar.b64Cod'],
  ['b64_dec', 'transformar.b64Dec'],
  ['url_cod', 'transformar.urlCod'],
  ['url_dec', 'transformar.urlDec'],
  ['slug', 'transformar.slug'],
  ['sin_tildes', 'transformar.sinTildes'],
  ['html_esc', 'transformar.htmlEsc'],
  ['html_desesc', 'transformar.htmlDesesc'],
].map(([id, clave]) => ({ id, clave }));

const LOCALE = 'es';

const ENTIDADES = [
  ['&', '&amp;'],
  ['<', '&lt;'],
  ['>', '&gt;'],
  ['"', '&quot;'],
  ["'", '&#39;'],
];

// Separa en palabras: espacios, guiones, guiones bajos y cambios camelCase.
function trocear(texto) {
  return texto
    .replace(/([\p{Ll}\d])(\p{Lu})/gu, '$1 $2')
    .split(/[^\p{L}\d]+/u)
    .filter(Boolean)
    .map(palabra => palabra.toLocaleLowerCase(LOCALE));
}

function mayusculaInicial(palabra) {
  return palabra.charAt(0).toLocaleUpperCase(LOCALE) + palabra.slice(1);
}

function quitarTildes(texto) {
  return texto
    .replace(/ñ/g, '')
    .replace(/Ñ/g, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(//g, 'ñ')
    .replace(//g, 'Ñ');
}

function ponerTitulo(texto) {
  const minusculas = texto.toLocaleLowerCase(LOCALE);
  return minusculas.replace(
    /(^|[\s\-_/(«"'])(\p{L})/gu,
    (_, separador, letra) => separador + letra.toLocaleUpperCase(LOCALE),
  );
}

function ponerOracion(texto) {
  const minusculas = texto.toLocaleLowerCase(LOCALE);
  return minusculas.replace(
    /(^\s*|[.!?]\s+|\n\s*)([¡¿]?)(\p{L})/gu,
    (_, previo, signo, letra) => previo + signo + letra.toLocaleUpperCase(LOCALE),
  );
}

function camel(texto) {
  const partes = trocear(texto);
  return partes
    .map((palabra, indice) => (indice ? mayusculaInicial(palabra) : palabra))
    .join('');
}

function json(texto, bonito) {
  try {
    return JSON.stringify(JSON.parse(texto), null, bonito ? 2 : 0);
  } catch {
    throw new Error('json_invalido');
  }
}

function codificarBase64(texto) {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  for (const byte of bytes) {
    binario += String.fromCharCode(byte);
  }
  return btoa(binario);
}

function decodificarBase64(texto) {
  const limpio = texto.replace(/\s+/g, '');
  let binario;
  try {
    binario = atob(limpio);
  } catch {
    throw new Error('base64_invalido');
  }
  const bytes = Uint8Array.from(binario, caracter => caracter.charCodeAt(0));
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error('base64_invalido');
  }
}

function decodificarUrl(texto) {
  try {
    return decodeURIComponent(texto.replace(/\+/g, ' '));
  } catch {
    throw new Error('url_invalida');
  }
}

function slug(texto) {
  return quitarTildes(texto)
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N')
    .toLocaleLowerCase(LOCALE)
    .replace(/[^a-z\d]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escaparHtml(texto) {
  return ENTIDADES.reduce(
    (salida, [caracter, entidad]) => salida.replaceAll(caracter, entidad),
    texto,
  );
}

function desescaparHtml(texto) {
  // &amp; se resuelve al final para no crear entidades nuevas por el camino.
  const alReves = [...ENTIDADES].reverse();
  const basico = alReves.reduce(
    (salida, [caracter, entidad]) => salida.replaceAll(entidad, caracter),
    texto.replaceAll('&#x27;', "'").replaceAll('&apos;', "'"),
  );
  return basico;
}

function lineas(texto) {
  return texto.split('\n');
}

const OPERACIONES = {
  mayusculas: texto => texto.toLocaleUpperCase(LOCALE),
  minusculas: texto => texto.toLocaleLowerCase(LOCALE),
  titulo: ponerTitulo,
  oracion: ponerOracion,
  camel,
  snake: texto => trocear(texto).join('_'),
  kebab: texto => trocear(texto).join('-'),
  espacios: texto => lineas(texto).map(linea => linea.trim().replace(/\s+/g, ' ')).join('\n'),
  una_linea: texto => texto.replace(/\s+/g, ' ').trim(),
  ordenar: texto => lineas(texto).sort((a, b) => a.localeCompare(b, LOCALE)).join('\n'),
  sin_duplicados: texto => [...new Set(lineas(texto))].join('\n'),
  invertir: texto => Array.from(texto).reverse().join(''),
  json_bonito: texto => json(texto, true),
  json_compacto: texto => json(texto, false),
  b64_cod: codificarBase64,
  b64_dec: decodificarBase64,
  url_cod: texto => encodeURIComponent(texto),
  url_dec: decodificarUrl,
  slug,
  sin_tildes: quitarTildes,
  html_esc: escaparHtml,
  html_desesc: desescaparHtml,
};

export function transformar(id, texto) {
  const operacion = OPERACIONES[id];
  if (!operacion) {
    throw new Error('transformacion_invalida');
  }
  return operacion(String(texto ?? ''));
}

export function contar(texto) {
  const valor = String(texto ?? '');
  const recortado = valor.trim();
  return {
    caracteres: Array.from(valor).length,
    palabras: recortado ? recortado.split(/\s+/).length : 0,
    lineas: valor ? lineas(valor).length : 0,
  };
}
