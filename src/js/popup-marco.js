// Marco del popup: cabecera (buscador y pestañas de icono), pie fino con el atajo y el asa de redimensionar.

import * as api from './api.js';
import { el, poner } from './dom.js';
import { t } from './i18n.js';
import { icono } from './iconos.js';
import { intentar, esMac, legible } from './comun.js';
import { duracion } from './herramientas/formato.js';
import { estado, ui, abrirAjustes } from './popup-estado.js';
import { pararVideo } from './popup-capturas.js';

export const nodos = {
  cabecera: document.querySelector('#cabecera'),
  buscador: document.querySelector('#buscador'),
  iconoBuscar: document.querySelector('#icono-buscar'),
  pestanas: document.querySelector('#pestanas'),
  contenido: document.querySelector('#contenido'),
  pie: document.querySelector('#pie'),
};

const PESTANAS = [
  { id: 'historial', icono: 'reloj' },
  { id: 'fragmentos', icono: 'fragmento' },
  { id: 'capturas', icono: 'captura' },
  { id: 'boveda', icono: 'llave' },
];

export function pintarPestanas() {
  const botones = PESTANAS.map((pestana, posicion) => {
    const activa = pestana.id === estado.pestana;
    const nombre = t(`pestana.${pestana.id}`);
    return el('button', {
      type: 'button',
      class: ['pestana', activa && 'activa'],
      attrs: {
        role: 'tab',
        'aria-selected': String(activa),
        'aria-label': nombre,
        title: t('pestana.titulo', { nombre, tecla: `${esMac ? '⌥' : 'Alt+'}${posicion + 1}` }),
        tabindex: '-1',
      },
      on: { click: () => ui.cambiarPestana(pestana.id) },
    }, icono(pestana.icono));
  });
  const ajustes = el('button', {
    type: 'button',
    class: 'pestana pestana-ajustes',
    attrs: { title: t('pestana.ajustes', { tecla: `${esMac ? '⌘' : 'Ctrl+'},` }), 'aria-label': t('ajustes.tituloVentana'), tabindex: '-1' },
    on: { click: abrirAjustes },
  }, icono('ajustes'));
  poner(nodos.pestanas, botones, ajustes);
}

function indicadorGrabando() {
  if (!estado.video.grabando) {
    return null;
  }
  return el('button', {
    type: 'button',
    class: 'pie-grabando',
    attrs: { title: t('capturas.detener') },
    on: { click: pararVideo },
  }, el('span', { class: 'punto-rec' }), duracion(estado.video.segundos));
}

export function pintarPie() {
  const pista = estado.panel ? t('pie.pistaPanel') : t(estado.pestana === 'capturas' ? 'pie.pistaCapturas' : 'pie.pistaLista');
  const atajo = legible(estado.ajustes.atajos.popup);
  poner(nodos.pie,
    el('span', { class: 'pie-pista', text: pista }),
    indicadorGrabando(),
    atajo && el('kbd', { class: 'pie-atajo', text: atajo, attrs: { title: t('pie.atajoTitulo') } }),
    el('span', {
      class: 'asa no-arrastrar',
      attrs: { title: t('pie.redimensionar'), 'aria-hidden': 'true' },
      on: { mousedown: alAsa },
    }, icono('asa')),
  );
}

function alAsa(evento) {
  if (evento.button === 0) {
    evento.preventDefault();
    intentar(() => api.redimensionarVentana());
  }
}

export function pintarMarco() {
  nodos.buscador.placeholder = t('buscador.placeholder');
  nodos.buscador.setAttribute('aria-label', t('buscador.etiqueta'));
  poner(nodos.iconoBuscar, icono('buscar'));
  pintarPestanas();
  pintarPie();
}

export function enfocarBuscador() {
  nodos.buscador.focus();
  const final = nodos.buscador.value.length;
  nodos.buscador.setSelectionRange(final, final);
}
