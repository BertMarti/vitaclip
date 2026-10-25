// Panel de detalle de un clip: contenido, color, contadores, botones, QR,
// transformaciones, acciones personalizadas (Pro) e IA (Pro).
// Los botones con clase .navegable se recorren con Tab/↑/↓ y se activan con Enter.

import * as api from './api.js';
import { el, poner } from './dom.js';
import { t, idiomaActual } from './i18n.js';
import { icono } from './iconos.js';
import { boton, mensajeError, mostrarError } from './comun.js';
import { haceCuanto, vistaPrevia } from './herramientas/buscar.js';
import { TRANSFORMACIONES, transformar, contar } from './herramientas/transformar.js';
import { detectar, aHex, aRgb, aHsl } from './herramientas/color.js';
import { aplicarAccion } from './herramientas/acciones.js';
import { estado, ui, pegarTexto, pegarClip, fijarClip, borrarClip } from './popup-estado.js';
import { seccionIa } from './popup-ia.js';

const MAX_QR = 1500;
const imagenes = new Map();
let qrAbiertoDe = null;

// Caché de imágenes: una sola petición por clip.
export function imagenDeClip(id) {
  if (!imagenes.has(id)) {
    const promesa = api.clipImagen(id).catch(error => {
      imagenes.delete(id);
      throw error;
    });
    imagenes.set(id, promesa);
  }
  return imagenes.get(id);
}

function svgADataUrl(svg) {
  const bytes = new TextEncoder().encode(svg);
  let binario = '';
  for (const byte of bytes) {
    binario += String.fromCharCode(byte);
  }
  return `data:image/svg+xml;base64,${btoa(binario)}`;
}

// --- Partes del panel

function cabecera(clip) {
  const partes = [
    t(clip.tipo === 'imagen' ? 'clip.tipoImagen' : 'clip.tipoTexto'),
    haceCuanto(clip.creado, Date.now(), idiomaActual()),
  ];
  if (clip.usos) {
    partes.push(t('clip.usos', { n: clip.usos }));
  }
  return el('div', { class: 'detalle-meta' },
    el('span', { text: partes.join(' · ') }),
    clip.fijado && el('span', { class: 'chip chip-fijado' }, icono('fijado'), t('clip.fijado')),
  );
}

function contenidoImagen(clip) {
  const caja = el('div', { class: 'imagen-grande' }, el('span', { class: 'cargando', text: t('comun.cargando') }));
  imagenDeClip(clip.id)
    .then(url => poner(caja, el('img', { src: url, alt: t('clip.tipoImagen') })))
    .catch(error => poner(caja, el('span', { class: 'error-texto', text: mensajeError(error) })));
  return el('div', {},
    caja,
    el('p', { class: 'contadores', text: t('clip.imagenTamano', { ancho: clip.ancho ?? '?', alto: clip.alto ?? '?' }) }),
  );
}

function contadores(texto) {
  const cifras = contar(texto);
  return el('p', {
    class: 'contadores',
    text: t('clip.contadores', { caracteres: cifras.caracteres, palabras: cifras.palabras, lineas: cifras.lineas }),
  });
}

function bloqueColor(color) {
  const muestra = el('span', { class: 'muestra-color' });
  muestra.style.backgroundColor = aRgb(color);
  const formatos = [['HEX', aHex(color)], ['RGB', aRgb(color)], ['HSL', aHsl(color)]];
  const botones = formatos.map(([nombre, valor]) => el('button', {
    type: 'button',
    class: 'boton-formato navegable',
    attrs: { title: t('color.pegarComo', { formato: nombre }) },
    on: { click: () => pegarTexto(valor) },
  }, el('strong', { text: nombre }), el('span', { text: valor })));
  return el('section', { class: 'seccion seccion-color' }, muestra, el('div', { class: 'formatos' }, botones));
}

function zonaQr(clip) {
  const caja = el('div', { class: 'qr' }, el('span', { class: 'cargando', text: t('comun.cargando') }));
  api.qrSvg(clip.texto)
    .then(svg => poner(caja, el('img', { src: svgADataUrl(svg), alt: t('qr.alt') })))
    .catch(error => poner(caja, el('span', { class: 'error-texto', text: mensajeError(error) })));
  return caja;
}

function alternarQr(clip) {
  qrAbiertoDe = qrAbiertoDe === clip.id ? null : clip.id;
  ui.repintarDetalle();
}

function botonera(clip) {
  const largo = clip.tipo !== 'texto' || Array.from(clip.texto).length > MAX_QR;
  const botonQr = boton(t('detalle.qr'), () => alternarQr(clip), {
    titulo: largo ? t('qr.demasiadoLargo') : t('qr.titulo'),
  });
  botonQr.disabled = largo;
  return el('div', { class: 'botonera' },
    boton(t('detalle.pegar'), () => pegarClip(clip), { clase: 'boton-primario', titulo: '↵' }),
    boton(t(clip.fijado ? 'detalle.soltar' : 'detalle.fijar'), () => fijarClip(clip), { icono: 'fijado' }),
    boton(t('detalle.borrar'), () => borrarClip(clip), { clase: 'boton-peligro' }),
    botonQr,
  );
}

// --- Transformaciones (navegables) con vista previa del resultado

function previa(id, texto) {
  try {
    return { texto: vistaPrevia(transformar(id, texto), 120), error: false };
  } catch (error) {
    return { texto: mensajeError(error), error: true };
  }
}

function seccionTransformaciones(texto) {
  const resultado = el('p', { class: 'vista-resultado', text: t('transformar.ayuda') });
  const mostrar = id => {
    const { texto: muestra, error } = previa(id, texto);
    resultado.textContent = muestra ? `→ ${muestra}` : '→ ∅';
    resultado.classList.toggle('error-texto', error);
  };
  const ejecutar = id => {
    try {
      pegarTexto(transformar(id, texto));
    } catch (error) {
      resultado.textContent = mensajeError(error);
      resultado.classList.add('error-texto');
    }
  };
  const botones = TRANSFORMACIONES.map(({ id, clave }) => el('button', {
    type: 'button',
    class: 'boton-herramienta navegable',
    text: t(clave),
    on: { click: () => ejecutar(id), focus: () => mostrar(id), mouseenter: () => mostrar(id) },
  }));
  return el('section', { class: 'seccion' },
    el('h3', {}, t('detalle.transformaciones'), el('span', { class: 'pista', text: t('detalle.pistaTab') })),
    el('div', { class: 'rejilla-herramientas' }, botones),
    resultado,
  );
}

// --- Acciones personalizadas

function lineaBloqueada(claveTexto) {
  return el('p', { class: 'linea-bloqueada' }, icono('candado'), el('span', { text: t(claveTexto) }));
}

function ejecutarAccion(accion, texto) {
  try {
    pegarTexto(aplicarAccion(accion, texto));
  } catch (error) {
    mostrarError(error);
  }
}

function seccionAcciones(texto) {
  const titulo = el('h3', {}, t('detalle.acciones'), !estado.pro && el('span', { class: 'chip chip-pro', text: t('comun.pro') }));
  if (!estado.pro) {
    return el('section', { class: 'seccion' }, titulo, lineaBloqueada('acciones.bloqueadas'));
  }
  if (!estado.acciones.length) {
    const ir = boton(t('acciones.crear'), () => ui.cambiarPestana('herramientas'), { clase: 'boton-enlace navegable' });
    return el('section', { class: 'seccion' }, titulo, el('p', { class: 'suave' }, t('acciones.ninguna'), ' ', ir));
  }
  const botones = estado.acciones.map(accion => el('button', {
    type: 'button',
    class: 'boton-herramienta navegable',
    on: { click: () => ejecutarAccion(accion, texto) },
  }, icono('rayo'), el('span', { text: accion.nombre })));
  return el('section', { class: 'seccion' }, titulo, el('div', { class: 'rejilla-herramientas' }, botones));
}

// --- Paneles completos

export function detalleClip(clip) {
  if (clip.id !== qrAbiertoDe) {
    qrAbiertoDe = null;
  }
  if (clip.tipo === 'imagen') {
    return el('div', { class: 'detalle-clip' }, cabecera(clip), contenidoImagen(clip), botonera(clip));
  }
  const color = detectar(clip.texto);
  return el('div', { class: 'detalle-clip' },
    cabecera(clip),
    el('pre', { class: 'contenido-clip', text: clip.texto }),
    contadores(clip.texto),
    botonera(clip),
    qrAbiertoDe === clip.id && zonaQr(clip),
    color && bloqueColor(color),
    seccionTransformaciones(clip.texto),
    seccionAcciones(clip.texto),
    seccionIa(clip),
  );
}

export function detalleCalculo(calculo) {
  const resultado = calculo.error
    ? el('p', { class: 'resultado-grande error-texto', text: t(`error.${calculo.error}`) })
    : el('p', { class: 'resultado-grande', text: calculo.resultado });
  return el('div', { class: 'detalle-clip' },
    el('div', { class: 'detalle-meta' }, el('span', { text: t('calculo.titulo') })),
    el('p', { class: 'expresion', text: calculo.expresion }),
    resultado,
    !calculo.error && el('div', { class: 'botonera' },
      boton(t('detalle.pegar'), () => pegarTexto(calculo.resultado), { clase: 'boton-primario navegable', titulo: '↵' }),
    ),
    el('p', { class: 'suave', text: t('calculo.ayuda') }),
  );
}
