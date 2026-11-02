// Panel de detalle de un clip: contenido, color, contadores, botones, QR, transformaciones e IA.
// Sustituye a la lista mientras está abierto. Los botones con clase .navegable se recorren
// con Tab/↑/↓ y se activan con Enter.

import * as api from './api.js';
import { el, poner } from './dom.js';
import { t, idiomaActual } from './i18n.js';
import { icono } from './iconos.js';
import { boton, mensajeError, esMac } from './comun.js';
import { haceCuanto, vistaPrevia } from './herramientas/buscar.js';
import { TRANSFORMACIONES, transformar, contar } from './herramientas/transformar.js';
import { detectar, aHex, aRgb, aHsl } from './herramientas/color.js';
import { ui, pegarTexto, pegarClip, fijarClip, borrarClip } from './popup-estado.js';
import { seccionIa } from './popup-ia.js';

const MAX_QR = 1500;
const imagenes = new Map();
let qrAbiertoDe = null;
let edicion = null;

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
  const partes = [haceCuanto(clip.creado, Date.now(), idiomaActual())];
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
    navegable: true,
  });
  botonQr.disabled = largo;
  return el('div', { class: 'botonera' },
    clip.tipo === 'texto' && boton(t('detalle.editar'), () => iniciarEdicion(clip), { navegable: true }),
    // Mientras se edita, «Pegar» pega lo editado.
    boton(t('detalle.pegar'), () => (edicion?.id === clip.id ? pegarTexto(edicion.texto) : pegarClip(clip)), { clase: 'boton-primario', titulo: '↵', navegable: true }),
    boton(t(clip.fijado ? 'detalle.soltar' : 'detalle.fijar'), () => fijarClip(clip), { icono: 'fijado', navegable: true }),
    boton(t('detalle.borrar'), () => borrarClip(clip), { clase: 'boton-peligro', navegable: true }),
    clip.tipo === 'texto' && botonQr,
  );
}

function iniciarEdicion(clip) {
  edicion = { id: clip.id, texto: clip.texto };
  ui.repintarDetalle();
  queueMicrotask(() => document.querySelector('.editor-clip')?.focus());
}

function cancelarEdicion() {
  edicion = null;
}

export function editarClip(clip) {
  if (clip?.tipo === 'texto') iniciarEdicion(clip);
}

export function cerrarEdicion() {
  cancelarEdicion();
}

function contenidoTexto(clip) {
  const texto = edicion?.id === clip.id ? edicion.texto : clip.texto;
  if (!edicion || edicion.id !== clip.id) return el('pre', { class: 'contenido-clip', text: texto });
  const cuadro = el('textarea', { class: 'contenido-clip editor-clip', value: texto, on: {
    input: evento => { edicion.texto = evento.target.value; },
    keydown: evento => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        evento.stopPropagation();
        cancelarEdicion();
        ui.repintarDetalle();
      } else if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) {
        evento.preventDefault();
        evento.stopPropagation();
        pegarTexto(evento.target.value);
      }
    },
  } });
  return el('div', { class: 'editor-zona' }, cuadro, el('p', {
    class: 'pista-editor',
    text: t('detalle.pistaEditar', { mod: esMac ? '⌘↩' : 'Ctrl+Enter' }),
  }));
}

// --- Transformaciones (navegables) con vista previa del resultado

function previa(id, texto) {
  try {
    return { texto: vistaPrevia(transformar(id, texto), 120), error: false };
  } catch (error) {
    return { texto: mensajeError(error), error: true };
  }
}

// `fuente` devuelve el texto en el momento de usarlo: mientras se edita, es lo que hay escrito en el cuadro.
function seccionTransformaciones(fuente) {
  const resultado = el('p', { class: 'vista-resultado', text: t('transformar.ayuda') });
  const mostrar = id => {
    const { texto: muestra, error } = previa(id, fuente());
    resultado.textContent = muestra ? `→ ${muestra}` : '→ ∅';
    resultado.classList.toggle('error-texto', error);
  };
  const ejecutar = id => {
    try {
      pegarTexto(transformar(id, fuente()));
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

// --- Paneles completos

export function detalleClip(clip) {
  if (clip.id !== qrAbiertoDe) {
    qrAbiertoDe = null;
  }
  if (clip.tipo === 'imagen') {
    return el('div', { class: 'detalle-clip' }, cabecera(clip), contenidoImagen(clip), botonera(clip));
  }
  const color = detectar(clip.texto);
  const texto = edicion?.id === clip.id ? edicion.texto : clip.texto;
  return el('div', { class: 'detalle-clip' },
    cabecera(clip),
    contenidoTexto(clip),
    contadores(texto),
    botonera(clip),
    qrAbiertoDe === clip.id && zonaQr(clip),
    color && bloqueColor(color),
    seccionTransformaciones(() => (edicion?.id === clip.id ? edicion.texto : clip.texto)),
    seccionIa(clip),
  );
}

export function detalleCalculo(calculo) {
  const resultado = calculo.error
    ? el('p', { class: 'resultado-grande error-texto', text: t(`error.${calculo.error}`) })
    : el('p', { class: 'resultado-grande', text: calculo.resultado });
  return el('div', { class: 'detalle-clip' },
    el('p', { class: 'expresion', text: calculo.expresion }),
    resultado,
    !calculo.error && el('div', { class: 'botonera' },
      boton(t('detalle.pegar'), () => pegarTexto(calculo.resultado), { clase: 'boton-primario navegable', titulo: '↵' }),
    ),
    el('p', { class: 'suave', text: t('calculo.ayuda') }),
  );
}
