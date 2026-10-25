// Barra compacta del editor de capturas (iconos SVG), la ayuda inicial y la etiqueta «ancho × alto».
//   Modo imagen: herramientas · 6 colores · 3 grosores · deshacer · copiar, guardar y cerrar.
//   Modo vídeo: «Grabar zona (Enter)», «Pantalla completa (F)» y «Cancelar (Esc)».

import { el } from './dom.js';
import { t } from './i18n.js';
import { icono } from './iconos.js';
import { esMac } from './comun.js';
import { HERRAMIENTAS, COLORES, GROSORES } from './herramientas/dibujo.js';

const ICONOS_HERRAMIENTA = {
  lapiz: 'lapiz', linea: 'linea', flecha: 'flecha', rectangulo: 'rectangulo', marcador: 'marcador', texto: 'letra',
};

const mod = esMac ? '⌘' : 'Ctrl+';

function botonIcono(nombreIcono, titulo, accion, clase = '') {
  return el('button', {
    type: 'button',
    class: ['herramienta', clase],
    attrs: { title: titulo, 'aria-label': titulo },
    on: { click: accion },
  }, icono(nombreIcono));
}

function separador() {
  return el('span', { class: 'separador', attrs: { 'aria-hidden': 'true' } });
}

function grupo(...hijos) {
  return el('div', { class: 'grupo-barra' }, hijos);
}

// acciones: {herramienta, color, grosor, deshacer, copiar, guardar, cerrar}
function barraImagen(acciones) {
  const herramientas = HERRAMIENTAS.map(id => {
    const boton = botonIcono(ICONOS_HERRAMIENTA[id], t(`captura.${id}`), () => acciones.herramienta(id));
    boton.dataset.herramienta = id;
    return boton;
  });
  const colores = COLORES.map(color => {
    const muestra = el('button', {
      type: 'button',
      class: 'color',
      dataset: { color },
      attrs: { title: t('captura.color'), 'aria-label': `${t('captura.color')} ${color}` },
      on: { click: () => acciones.color(color) },
    });
    muestra.style.setProperty('--muestra', color);
    return muestra;
  });
  const grosores = GROSORES.map((grosor, posicion) => el('button', {
    type: 'button',
    class: ['grosor', `grosor-${posicion}`],
    dataset: { grosor: String(grosor) },
    attrs: { title: t(`captura.grosor${posicion}`), 'aria-label': t(`captura.grosor${posicion}`) },
    on: { click: () => acciones.grosor(grosor) },
  }, el('span', { class: 'grosor-punto' })));
  const deshacer = botonIcono('deshacer', t('captura.deshacer', { mod }), acciones.deshacer, 'deshacer');
  return [
    grupo(herramientas), separador(),
    grupo(colores), separador(),
    grupo(grosores), separador(),
    grupo(deshacer), separador(),
    grupo(
      botonIcono('copiar', t('captura.copiar', { mod }), acciones.copiar, 'principal'),
      botonIcono('guardar', t('captura.guardar', { mod }), acciones.guardar),
      botonIcono('cerrar', t('captura.cerrar'), acciones.cerrar),
    ),
  ];
}

function botonTexto(nombreIcono, texto, tecla, accion, clase = '') {
  return el('button', { type: 'button', class: ['accion-barra', clase], on: { click: accion } },
    icono(nombreIcono), el('span', { text: texto }), el('kbd', { text: tecla }));
}

// acciones: {grabarZona, pantallaCompleta, cerrar}
function barraVideo(acciones) {
  return [
    botonTexto('grabar', t('captura.grabarZona'), '↵', acciones.grabarZona, 'principal'),
    botonTexto('pantalla', t('captura.pantallaCompleta'), 'F', acciones.pantallaCompleta),
    botonTexto('cerrar', t('captura.cancelar'), 'Esc', acciones.cerrar),
  ];
}

export function crearBarra(modo, acciones) {
  const nodo = el('div', { class: ['barra-captura', `barra-${modo}`], attrs: { role: 'toolbar', 'aria-label': t('captura.barra') } },
    modo === 'video' ? barraVideo(acciones) : barraImagen(acciones));
  // La barra no debe empezar selecciones ni dibujos.
  nodo.addEventListener('pointerdown', evento => evento.stopPropagation());
  return nodo;
}

// Marca la herramienta, el color y el grosor elegidos.
export function marcarBarra(nodo, { herramienta, color, grosor, puedeDeshacer }) {
  for (const boton of nodo.querySelectorAll('[data-herramienta]')) {
    const activa = boton.dataset.herramienta === herramienta;
    boton.classList.toggle('activa', activa);
    boton.setAttribute('aria-pressed', String(activa));
  }
  for (const boton of nodo.querySelectorAll('[data-color]')) {
    boton.classList.toggle('activa', boton.dataset.color === color);
  }
  for (const boton of nodo.querySelectorAll('[data-grosor]')) {
    boton.classList.toggle('activa', Number(boton.dataset.grosor) === grosor);
  }
  const deshacer = nodo.querySelector('.deshacer');
  if (deshacer) {
    deshacer.disabled = !puedeDeshacer;
  }
}

// Ayuda centrada del principio. En vídeo incluye los botones de pantalla completa y cancelar.
export function crearAyuda(modo, acciones) {
  const ayuda = el('div', { class: 'ayuda-captura' },
    el('span', { text: t(modo === 'video' ? 'captura.ayudaVideo' : 'captura.ayuda') }),
    modo === 'video' && el('div', { class: 'ayuda-botones' },
      botonTexto('pantalla', t('captura.pantallaCompleta'), 'F', acciones.pantallaCompleta, 'principal'),
      botonTexto('cerrar', t('captura.cancelar'), 'Esc', acciones.cerrar),
    ),
  );
  ayuda.addEventListener('pointerdown', evento => {
    if (evento.target.closest('button')) {
      evento.stopPropagation();
    }
  });
  return ayuda;
}
