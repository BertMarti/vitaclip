// Detección y conversión de colores CSS (#hex, rgb(), hsl()).

const NUMERO = '(\\d+(?:\\.\\d+)?)';
const SEPARADOR = '\\s*[,\\s]\\s*';
const ALFA = `(?:\\s*[,/]\\s*${NUMERO}(%?))?`;

const PATRON_HEX = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
const PATRON_RGB = new RegExp(`^rgba?\\(\\s*${NUMERO}${SEPARADOR}${NUMERO}${SEPARADOR}${NUMERO}${ALFA}\\s*\\)$`, 'i');
const PATRON_HSL = new RegExp(`^hsla?\\(\\s*${NUMERO}(?:deg)?${SEPARADOR}${NUMERO}%${SEPARADOR}${NUMERO}%${ALFA}\\s*\\)$`, 'i');

function limitar(numero, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, numero));
}

function leerAlfa(valor, porcentaje) {
  if (valor === undefined) {
    return 1;
  }
  const numero = Number(valor);
  return limitar(porcentaje ? numero / 100 : numero, 0, 1);
}

function desdeHex(valor) {
  let hex = valor;
  if (hex.length === 3 || hex.length === 4) {
    hex = [...hex].map(digito => digito + digito).join('');
  }
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
    a: hex.length === 8 ? Math.round((parseInt(hex.slice(6, 8), 16) / 255) * 1000) / 1000 : 1,
  };
}

function canalHsl(p, q, t) {
  let valor = t;
  if (valor < 0) valor += 1;
  if (valor > 1) valor -= 1;
  if (valor < 1 / 6) return p + (q - p) * 6 * valor;
  if (valor < 1 / 2) return q;
  if (valor < 2 / 3) return p + (q - p) * (2 / 3 - valor) * 6;
  return p;
}

function desdeHsl(h, s, l, a) {
  const tono = (((h % 360) + 360) % 360) / 360;
  const saturacion = limitar(s / 100, 0, 1);
  const luz = limitar(l / 100, 0, 1);
  const q = luz < 0.5 ? luz * (1 + saturacion) : luz + saturacion - luz * saturacion;
  const p = 2 * luz - q;
  return {
    r: Math.round(canalHsl(p, q, tono + 1 / 3) * 255),
    g: Math.round(canalHsl(p, q, tono) * 255),
    b: Math.round(canalHsl(p, q, tono - 1 / 3) * 255),
    a,
  };
}

export function detectar(texto) {
  const valor = String(texto ?? '').trim();
  if (valor.length > 60) {
    return null;
  }
  const hex = valor.match(PATRON_HEX);
  if (hex) {
    return desdeHex(hex[1]);
  }
  const rgb = valor.match(PATRON_RGB);
  if (rgb) {
    return {
      r: Math.round(limitar(Number(rgb[1]), 0, 255)),
      g: Math.round(limitar(Number(rgb[2]), 0, 255)),
      b: Math.round(limitar(Number(rgb[3]), 0, 255)),
      a: leerAlfa(rgb[4], rgb[5]),
    };
  }
  const hsl = valor.match(PATRON_HSL);
  if (hsl) {
    return desdeHsl(Number(hsl[1]), Number(hsl[2]), Number(hsl[3]), leerAlfa(hsl[4], hsl[5]));
  }
  return null;
}

function dosHex(numero) {
  return Math.round(numero).toString(16).padStart(2, '0');
}

export function aHex(color) {
  const base = `#${dosHex(color.r)}${dosHex(color.g)}${dosHex(color.b)}`;
  return color.a < 1 ? base + dosHex(color.a * 255) : base;
}

export function aRgb(color) {
  if (color.a < 1) {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${Number(color.a.toFixed(3))})`;
  }
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

function calcularTono(r, g, b, maximo, diferencia) {
  if (!diferencia) {
    return 0;
  }
  let tono;
  if (maximo === r) {
    tono = ((g - b) / diferencia) % 6;
  } else if (maximo === g) {
    tono = (b - r) / diferencia + 2;
  } else {
    tono = (r - g) / diferencia + 4;
  }
  return (tono * 60 + 360) % 360;
}

export function aHsl(color) {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  const maximo = Math.max(r, g, b);
  const minimo = Math.min(r, g, b);
  const diferencia = maximo - minimo;
  const luz = (maximo + minimo) / 2;
  const saturacion = diferencia === 0 ? 0 : diferencia / (1 - Math.abs(2 * luz - 1));
  const tono = calcularTono(r, g, b, maximo, diferencia);
  const partes = `${Math.round(tono)}, ${Math.round(saturacion * 100)}%, ${Math.round(luz * 100)}%`;
  return color.a < 1 ? `hsla(${partes}, ${Number(color.a.toFixed(3))})` : `hsl(${partes})`;
}
