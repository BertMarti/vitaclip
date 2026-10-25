// Pintado del editor de capturas en un canvas 2D: imagen congelada, velo, selección, asas y anotaciones.
// Y la exportación del recorte a PNG en píxeles físicos con las anotaciones escaladas.

import { centrosAsas, aFisicos } from './herramientas/seleccion.js';
import { puntaFlecha, rectDeAnotacion, escalarAnotacion, OPACIDAD_MARCADOR } from './herramientas/dibujo.js';

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
  const { ancho, alto, imagen, seleccion, anotaciones, enCurso, mostrarAsas, acento } = escena;
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
  for (const anotacion of anotaciones) {
    dibujarAnotacion(ctx, anotacion);
  }
  if (enCurso) {
    dibujarAnotacion(ctx, enCurso);
  }
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
  // Origen en px CSS exactamente sobre el borde físico redondeado, para que nada se desplace.
  const origen = { x: fisico.x / escalaX, y: fisico.y / escalaY };
  for (const anotacion of anotaciones) {
    dibujarAnotacion(ctx, escalarAnotacion(anotacion, origen, escalaX, escalaY));
  }
  const blob = await new Promise(resolver => lienzo.toBlob(resolver, 'image/png'));
  if (!blob) {
    throw new Error('exportar_captura');
  }
  return blobABase64(blob);
}
