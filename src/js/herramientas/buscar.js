// Utilidades de búsqueda y presentación de la lista (sin DOM).

const PREFIJOS = /(^|\s)(?:img|url|fij):/gi;

function normalizar(texto) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('es');
}

function escaparRegex(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Palabras de la consulta, sin prefijos de filtro.
export function terminos(consulta) {
  return String(consulta ?? '')
    .replace(PREFIJOS, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

// Para cada carácter del texto normalizado, a qué carácter original corresponde.
function mapaDeIndices(original) {
  const mapa = [];
  original.forEach((caracter, indice) => {
    const longitud = normalizar(caracter).length;
    for (let i = 0; i < longitud; i += 1) {
      mapa.push(indice);
    }
  });
  return mapa;
}

function buscarRangos(original, palabras) {
  const normal = original.map(normalizar).join('');
  const mapa = mapaDeIndices(original);
  const expresion = new RegExp(palabras.map(normalizar).map(escaparRegex).join('|'), 'g');
  const rangos = [];
  for (const coincidencia of normal.matchAll(expresion)) {
    if (!coincidencia[0]) {
      continue;
    }
    const inicio = mapa[coincidencia.index];
    const fin = mapa[coincidencia.index + coincidencia[0].length - 1] + 1;
    rangos.push([inicio, fin]);
  }
  return rangos;
}

// Trocea el texto en partes marcadas y no marcadas según la consulta.
export function resaltar(texto, consulta) {
  const valor = String(texto ?? '');
  const palabras = terminos(consulta);
  if (!palabras.length || !valor) {
    return [{ texto: valor, marcado: false }];
  }
  const original = Array.from(valor);
  const rangos = buscarRangos(original, palabras);
  if (!rangos.length) {
    return [{ texto: valor, marcado: false }];
  }
  const salida = [];
  let cursor = 0;
  for (const [inicio, fin] of rangos) {
    if (inicio < cursor) {
      continue;
    }
    if (inicio > cursor) {
      salida.push({ texto: original.slice(cursor, inicio).join(''), marcado: false });
    }
    salida.push({ texto: original.slice(inicio, fin).join(''), marcado: true });
    cursor = fin;
  }
  if (cursor < original.length) {
    salida.push({ texto: original.slice(cursor).join(''), marcado: false });
  }
  return salida;
}

// ¿Contiene el texto todas las palabras de la consulta (sin tildes ni mayúsculas)?
export function coincide(texto, consulta) {
  const normal = normalizar(String(texto ?? ''));
  return terminos(consulta).every(palabra => normal.includes(normalizar(palabra)));
}

export function vistaPrevia(texto, max = 160) {
  const limpio = String(texto ?? '').replace(/\s+/g, ' ').trim();
  const caracteres = Array.from(limpio);
  if (caracteres.length <= max) {
    return limpio;
  }
  return `${caracteres.slice(0, Math.max(0, max - 1)).join('').trimEnd()}…`;
}

const TEXTOS_TIEMPO = {
  es: {
    ahora: 'ahora',
    minutos: n => `hace ${n} min`,
    horas: n => `hace ${n} h`,
    ayer: 'ayer',
    dias: n => `hace ${n} d`,
  },
  en: {
    ahora: 'now',
    minutos: n => `${n} min ago`,
    horas: n => `${n} h ago`,
    ayer: 'yesterday',
    dias: n => `${n} d ago`,
  },
};

export function haceCuanto(marca, ahora = Date.now(), idioma = 'es') {
  const momento = marca instanceof Date ? marca.getTime() : Number(marca);
  const textos = TEXTOS_TIEMPO[idioma] || TEXTOS_TIEMPO.es;
  const diferencia = Math.max(0, ahora - momento);
  const minutos = Math.floor(diferencia / 60000);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);
  if (minutos < 1) return textos.ahora;
  if (minutos < 60) return textos.minutos(minutos);
  if (horas < 24) return textos.horas(horas);
  if (dias < 2) return textos.ayer;
  if (dias < 7) return textos.dias(dias);
  return new Date(momento).toLocaleDateString(idioma === 'en' ? 'en-GB' : 'es-ES', {
    day: 'numeric',
    month: 'short',
  });
}

export function esUrl(texto) {
  return /^(https?:\/\/|www\.)\S+$/i.test(String(texto ?? '').trim());
}
