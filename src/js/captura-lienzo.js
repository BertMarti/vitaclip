// Pintado del editor de capturas en un canvas 2D: imagen congelada, velo, selección, asas y anotaciones.
// Y la exportación del recorte a PNG en píxeles físicos con las anotaciones escaladas.

import { centrosAsas, aFisicos } from './herramientas/seleccion.js';
import {
  puntaFlecha, rectDeAnotacion, escalarAnotacion, OPACIDAD_MARCADOR,
  numeroDe, colorNumero,
} from './herramientas/dibujo.js';

const VELO = 'rgba(8, 10, 6, 0.55)';
const LADO_ASA = 7;
export const FUENTE_TEXTO = 'system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, sans-serif';

function trazoLibre(ctx, anotacion) {
  const [primero, ...resto] = anotacion.puntos;
  if (!primero) {
    return;
  }
  if (!resto.length) {
    ctx.beginPath();
    ctx.arc(primero[0], primero[1], anotacion.grosor / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(primero[0], primero[1]);
  for (const [x, y] of resto) {
    ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function flecha(ctx, anotacion) {
  const { x1, y1, x2, y2, grosor } = anotacion;
  const punta = puntaFlecha(x1, y1, x2, y2, grosor, 10 * (anotacion.escala ?? 1));
  if (!punta) {
    return;
  }
  // La línea acaba en la base de la punta para que no asome por delante.
  const baseX = (punta.izquierda[0] + punta.derecha[0]) / 2;
  const baseY = (punta.izquierda[1] + punta.derecha[1]) / 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(baseX, baseY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(...punta.punta);
  ctx.lineTo(...punta.izquierda);
  ctx.lineTo(...punta.derecha);
  ctx.closePath();
  ctx.fill();
}

function pixelar(ctx, fuente, anotacion, escalaX = 1, escalaY = escalaX) {
  const rect = rectDeAnotacion(anotacion);
  const bloque = anotacion.grosor;
  const pequeno = document.createElement('canvas');
  pequeno.width = Math.max(1, Math.ceil(rect.ancho / bloque));
  pequeno.height = Math.max(1, Math.ceil(rect.alto / bloque));
  const pequenoCtx = pequeno.getContext('2d');
  pequenoCtx.imageSmoothingEnabled = true;
  pequenoCtx.drawImage(
    fuente,
    rect.x * escalaX, rect.y * escalaY, rect.ancho * escalaX, rect.alto * escalaY,
    0, 0, pequeno.width, pequeno.height,
  );
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(pequeno, rect.x, rect.y, rect.ancho, rect.alto);
  ctx.restore();
}

function numero(ctx, anotacion, anotaciones, indice, escala = 1) {
  const diametro = anotacion.grosor;
  ctx.save();
  ctx.fillStyle = anotacion.color;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = Math.max(1, escala);
  ctx.beginPath();
  ctx.arc(anotacion.x, anotacion.y, diametro / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = colorNumero(anotacion.color);
  ctx.font = `700 ${diametro * 0.55}px ${FUENTE_TEXTO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(numeroDe(anotaciones, indice)), anotacion.x, anotacion.y);
  ctx.restore();
}

// Dibuja una anotación (en el sistema de coordenadas que tenga el contexto).
export function dibujarAnotacion(ctx, anotacion) {
  ctx.save();
  ctx.strokeStyle = anotacion.color;
  ctx.fillStyle = anotacion.color;
  ctx.lineWidth = anotacion.grosor;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (anotacion.tipo) {
    case 'marcador':
      ctx.globalAlpha = OPACIDAD_MARCADOR;
      ctx.lineCap = 'square';
      trazoLibre(ctx, anotacion);
      break;
    case 'lapiz':
      trazoLibre(ctx, anotacion);
      break;
    case 'linea':
      ctx.beginPath();
      ctx.moveTo(anotacion.x1, anotacion.y1);
      ctx.lineTo(anotacion.x2, anotacion.y2);
      ctx.stroke();
      break;
    case 'flecha':
      flecha(ctx, anotacion);
      break;
    case 'rectangulo': {
      const rect = rectDeAnotacion(anotacion);
      ctx.lineJoin = 'miter';
      ctx.strokeRect(rect.x, rect.y, rect.ancho, rect.alto);
      break;
    }
    case 'numero':
      numero(ctx, anotacion, [anotacion], 0, anotacion.escala ?? 1);
      break;
    case 'texto':
      ctx.font = `600 ${anotacion.grosor}px ${FUENTE_TEXTO}`;
      ctx.textBaseline = 'top';
      ctx.fillText(anotacion.texto, anotacion.x, anotacion.y);
      break;
    default:
      break;
  }
  ctx.restore();
}

function dibujarNumeroConIndice(ctx, anotacion, anotaciones, indice) {
  numero(ctx, anotacion, anotaciones, indice, anotacion.escala ?? 1);
}

function pintarAnotaciones(ctx, fuente, anotaciones, escalaX, escalaY) {
  anotaciones.forEach(anotacion => {
    if (anotacion.tipo === 'pixelar') {
      pixelar(ctx, fuente, anotacion, escalaX, escalaY);
    }
  });
  anotaciones.forEach((anotacion, indice) => {
    if (anotacion.tipo === 'numero') {
      dibujarNumeroConIndice(ctx, anotacion, anotaciones, indice);
    } else if (anotacion.tipo !== 'pixelar') {
      dibujarAnotacion(ctx, anotacion);
    }
  });
}

function velo(ctx, ancho, alto, seleccion) {
  ctx.save();
  ctx.fillStyle = VELO;
  ctx.beginPath();
  ctx.rect(0, 0, ancho, alto);
  if (seleccion) {
    ctx.rect(seleccion.x, seleccion.y, seleccion.ancho, seleccion.alto);
  }
  ctx.fill('evenodd');
  ctx.restore();
}

function asas(ctx, seleccion, acento) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = acento;
  ctx.lineWidth = 1.5;
  for (const { x, y } of Object.values(centrosAsas(seleccion))) {
    ctx.fillRect(x - LADO_ASA / 2, y - LADO_ASA / 2, LADO_ASA, LADO_ASA);
    ctx.strokeRect(x - LADO_ASA / 2, y - LADO_ASA / 2, LADO_ASA, LADO_ASA);
  }
  ctx.restore();
}

// escena: {ancho, alto, imagen, seleccion, anotaciones, enCurso, mostrarAsas, acento} (todo en px CSS).
export function pintarEscena(ctx, escena) {
  const { ancho, alto, imagen, seleccion, anotaciones, enCurso, mostrarAsas, acento, escalaX = 1, escalaY = escalaX } = escena;
  ctx.clearRect(0, 0, ancho, alto);
  if (imagen) {
    ctx.drawImage(imagen, 0, 0, ancho, alto);
  }
  velo(ctx, ancho, alto, seleccion);
  if (!seleccion) {
    return;
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(seleccion.x, seleccion.y, seleccion.ancho, seleccion.alto);
  ctx.clip();
  const todas = enCurso ? [...anotaciones, enCurso] : anotaciones;
  pintarAnotaciones(ctx, imagen, todas, escalaX, escalaY);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = acento;
  ctx.lineWidth = 1;
  ctx.strokeRect(Math.round(seleccion.x) + 0.5, Math.round(seleccion.y) + 0.5, Math.round(seleccion.ancho) - 1, Math.round(seleccion.alto) - 1);
  ctx.restore();
  if (mostrarAsas) {
    asas(ctx, seleccion, acento);
  }
}

function blobABase64(blob) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.addEventListener('load', () => resolver(String(lector.result).replace(/^data:[^,]*,/, '')));
    lector.addEventListener('error', () => rechazar(new Error('lectura_archivo')));
    lector.readAsDataURL(blob);
  });
}

// Recorte en píxeles físicos con las anotaciones → PNG en base64 sin el prefijo data:.
export async function exportarPng(imagen, seleccion, anotaciones, escalaX, escalaY) {
  const limites = { ancho: imagen.naturalWidth, alto: imagen.naturalHeight };
  const fisico = aFisicos(seleccion, escalaX, escalaY, limites);
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.max(1, fisico.ancho);
  lienzo.height = Math.max(1, fisico.alto);
  const ctx = lienzo.getContext('2d');
  ctx.drawImage(imagen, fisico.x, fisico.y, fisico.ancho, fisico.alto, 0, 0, fisico.ancho, fisico.alto);
  const base = document.createElement('canvas');
  base.width = lienzo.width;
  base.height = lienzo.height;
  base.getContext('2d').drawImage(lienzo, 0, 0);
  // Origen en px CSS exactamente sobre el borde físico redondeado, para que nada se desplace.
  const origen = { x: fisico.x / escalaX, y: fisico.y / escalaY };
  const escaladas = anotaciones.map(anotacion => escalarAnotacion(anotacion, origen, escalaX, escalaY));
  for (const [indice, anotacion] of escaladas.entries()) {
    if (anotacion.tipo === 'pixelar') {
      pixelar(ctx, base, anotacion);
    }
  }
  for (const [indice, anotacion] of escaladas.entries()) {
    if (anotacion.tipo === 'numero') {
      dibujarNumeroConIndice(ctx, anotacion, escaladas, indice);
    } else if (anotacion.tipo !== 'pixelar') {
      dibujarAnotacion(ctx, anotacion);
    }
  }
  const blob = await new Promise(resolver => lienzo.toBlob(resolver, 'image/png'));
  if (!blob) {
    throw new Error('exportar_captura');
  }
  return blobABase64(blob);
}
