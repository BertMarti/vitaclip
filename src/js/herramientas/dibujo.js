// Anotaciones del editor de capturas: modelo y geometría puros (sin canvas).
// Coordenadas en píxeles CSS de la ventana; escalarAnotacion() las pasa al recorte en píxeles físicos.
// `grosor` es el ancho real del trazo en píxeles (en el texto, el tamaño de letra), así que escalar es multiplicar.
//   lapiz / marcador: {tipo, puntos: [[x, y]…], color, grosor}
//   linea / flecha / rectangulo: {tipo, x1, y1, x2, y2, color, grosor}
//   texto: {tipo, x, y, texto, color, grosor}
//   pixelar: {tipo, x1, y1, x2, y2, grosor}
//   numero: {tipo, x, y, color, grosor}

import { normalizar } from './seleccion.js';

export const HERRAMIENTAS = ['lapiz', 'linea', 'flecha', 'rectangulo', 'marcador', 'texto', 'pixelar', 'numero'];
export const COLORES = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#111111', '#ffffff'];
export const GROSORES = [2, 4, 8];
export const OPACIDAD_MARCADOR = 0.4;

const ANGULO_PUNTA = Math.PI / 7;

// Puntas de la flecha que acaba en (x2, y2): dos puntos a cada lado de la línea.
// `minimo` es el lado mínimo de la punta (10 px en pantalla; escalado al exportar).
// Devuelve null si la flecha no tiene longitud.
export function puntaFlecha(x1, y1, x2, y2, grosor = 4, minimo = 10) {
  const largo = Math.hypot(x2 - x1, y2 - y1);
  if (largo === 0) {
    return null;
  }
  const lado = Math.min(Math.max(minimo, grosor * 4), largo);
  const angulo = Math.atan2(y2 - y1, x2 - x1);
  return {
    punta: [x2, y2],
    izquierda: [x2 - lado * Math.cos(angulo - ANGULO_PUNTA), y2 - lado * Math.sin(angulo - ANGULO_PUNTA)],
    derecha: [x2 - lado * Math.cos(angulo + ANGULO_PUNTA), y2 - lado * Math.sin(angulo + ANGULO_PUNTA)],
  };
}

// Rectángulo de una anotación con ancho y alto positivos, se dibuje hacia donde se dibuje.
export function rectDeAnotacion(anotacion) {
  return normalizar(anotacion.x1, anotacion.y1, anotacion.x2, anotacion.y2);
}

// Tamaño de letra y ancho del marcador según el grosor elegido en la barra.
export function tamanoTexto(grosor) {
  return Math.round(12 + grosor * 2.5);
}

export function anchoMarcador(grosor) {
  return grosor * 4 + 6;
}

export function bloquePixelado(grosor) {
  return ({ 2: 6, 4: 10, 8: 16 })[grosor] ?? 10;
}

export function diametroNumero(grosor) {
  return ({ 2: 22, 4: 28, 8: 36 })[grosor] ?? 28;
}

// Grosor real de una anotación nueva según la herramienta y el grosor elegido.
export function grosorPara(herramienta, grosor) {
  if (herramienta === 'marcador') return anchoMarcador(grosor);
  if (herramienta === 'texto') return tamanoTexto(grosor);
  if (herramienta === 'pixelar') return bloquePixelado(grosor);
  if (herramienta === 'numero') return diametroNumero(grosor);
  return grosor;
}

export function numeroDe(anotaciones, indice) {
  return 1 + anotaciones.slice(0, indice).filter(anotacion => anotacion.tipo === 'numero').length;
}

export function colorNumero(color) {
  return color === '#ffffff' || color === '#f59e0b' ? '#111111' : '#ffffff';
}

// ¿Merece la pena guardarla? (un clic sin mover no deja líneas ni rectángulos vacíos).
export function esUtil(anotacion) {
  switch (anotacion.tipo) {
    case 'lapiz':
    case 'marcador':
      return anotacion.puntos.length > 0;
    case 'texto':
      return anotacion.texto.trim().length > 0;
    case 'rectangulo':
    case 'pixelar': {
      const rect = rectDeAnotacion(anotacion);
      return rect.ancho > 1 && rect.alto > 1;
    }
    case 'numero':
      return true;
    default:
      return Math.hypot(anotacion.x2 - anotacion.x1, anotacion.y2 - anotacion.y1) > 1;
  }
}

// Pasa una anotación al sistema del recorte: resta el origen de la selección y escala
// a píxeles físicos (también el grosor, para que se vea igual que en pantalla).
export function escalarAnotacion(anotacion, origen, escalaX, escalaY = escalaX) {
  const px = x => (x - origen.x) * escalaX;
  const py = y => (y - origen.y) * escalaY;
  const media = (escalaX + escalaY) / 2;
  const copia = { ...anotacion, grosor: anotacion.grosor * media, escala: (anotacion.escala ?? 1) * media };
  if (anotacion.puntos) {
    copia.puntos = anotacion.puntos.map(([x, y]) => [px(x), py(y)]);
  }
  if ('x1' in anotacion) {
    Object.assign(copia, { x1: px(anotacion.x1), y1: py(anotacion.y1), x2: px(anotacion.x2), y2: py(anotacion.y2) });
  }
  if (anotacion.tipo === 'texto' || anotacion.tipo === 'numero') {
    Object.assign(copia, { x: px(anotacion.x), y: py(anotacion.y) });
  }
  return copia;
}
