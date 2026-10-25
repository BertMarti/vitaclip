// Ventana de ajustes: navegación lateral y sección General.
// Atajos, Capturas y vídeo, Privacidad, IA y Acerca de están en sus propios módulos.
// Todo se guarda al momento con aviso «Guardado»; los errores se enseñan y se deshace el cambio.

import * as api from './api.js';
import { el, poner } from './dom.js';
import { t, setIdioma } from './i18n.js';
import { icono } from './iconos.js';
import { aplicarTema, intentar } from './comun.js';
import {
  datos, pagina, guardar, mezclarAjustes, cabeceraSeccion, filaAjuste, interruptor, grupoAjustes,
  selector, segmentado, LIMITE_MINIMO, LIMITE_MAXIMO, LIMITE_DEFECTO,
} from './ajustes-comun.js';
import { seccionAtajos, activarBienvenida } from './ajustes-atajos.js';
import { seccionCapturas } from './ajustes-capturas.js';
import { seccionPrivacidad } from './ajustes-privacidad.js';
import { seccionIa, seccionAcerca } from './ajustes-ia.js';

const SECCIONES = [
  { id: 'general', clave: 'ajustes.general', icono: 'ajustes', pintar: seccionGeneral },
  { id: 'atajos', clave: 'ajustes.atajos', icono: 'teclado', pintar: seccionAtajos },
  { id: 'capturas', clave: 'ajustes.capturas', icono: 'captura', pintar: seccionCapturas },
  { id: 'privacidad', clave: 'ajustes.privacidad', icono: 'escudo', pintar: seccionPrivacidad },
  { id: 'ia', clave: 'ajustes.ia', icono: 'chispa', pintar: seccionIa },
  { id: 'acerca', clave: 'ajustes.acerca', icono: 'info', pintar: seccionAcerca },
];

const nodos = {
  navegacion: document.querySelector('#navegacion'),
  panel: document.querySelector('#panel'),
};

let seccion = 'general';

// --- General

async function cambiarTema(tema) {
  aplicarTema(tema);
  await guardar({ tema });
  aplicarTema(datos.ajustes.tema);
  pintar();
}

async function cambiarIdioma(idioma) {
  await guardar({ idioma });
  setIdioma(datos.ajustes.idioma);
  pintar();
}

async function cambiarPausa(pausado) {
  await intentar(() => api.pausaCambiar(pausado));
  await guardar({ pausado });
}

function controlLimite() {
  return el('input', {
    type: 'number',
    class: 'campo campo-numero',
    min: LIMITE_MINIMO,
    max: LIMITE_MAXIMO,
    step: 10,
    value: datos.ajustes.limiteHistorial,
    attrs: { 'aria-label': t('ajustes.limite') },
    on: {
      change: evento => {
        const numero = Math.round(Number(evento.target.value)) || LIMITE_DEFECTO;
        const limite = Math.max(LIMITE_MINIMO, Math.min(LIMITE_MAXIMO, numero));
        evento.target.value = limite;
        guardar({ limiteHistorial: limite });
      },
    },
  });
}

function selectorVentana() {
  const opciones = [['raton', 'ventana.raton'], ['recordar', 'ventana.recordar']];
  const cambiar = modo => guardar({ ventana: { ...datos.ajustes.ventana, modo } });
  return selector(datos.ajustes.ventana.modo, opciones, cambiar, t('ajustes.ventana'));
}

function seccionGeneral() {
  const a = datos.ajustes;
  const temas = [['sistema', 'tema.sistema'], ['claro', 'tema.claro'], ['oscuro', 'tema.oscuro']];
  return [
    cabeceraSeccion('ajustes.general', 'ajustes.generalDescripcion'),
    grupoAjustes(
      filaAjuste('ajustes.idioma', null, selector(a.idioma, [['es', 'idioma.es'], ['en', 'idioma.en']], cambiarIdioma, t('ajustes.idioma'))),
      filaAjuste('ajustes.tema', null, segmentado(a.tema, temas, cambiarTema, t('ajustes.tema'))),
    ),
    grupoAjustes(
      filaAjuste('ajustes.pegarAuto', 'ajustes.pegarAutoDescripcion', interruptor(a.pegarAuto, valor => guardar({ pegarAuto: valor }), t('ajustes.pegarAuto'))),
      filaAjuste('ajustes.arrancar', 'ajustes.arrancarDescripcion', interruptor(a.arrancarConSistema, valor => guardar({ arrancarConSistema: valor }), t('ajustes.arrancar'))),
      filaAjuste('ajustes.pausar', 'ajustes.pausarDescripcion', interruptor(a.pausado, cambiarPausa, t('ajustes.pausar'))),
    ),
    grupoAjustes(
      filaAjuste('ajustes.limite', 'ajustes.limiteDescripcion', controlLimite()),
      filaAjuste('ajustes.ventana', 'ajustes.ventanaDescripcion', selectorVentana()),
    ),
  ];
}

// --- Navegación y pintado

function pintarNavegacion() {
  const marca = el('div', { class: 'marca' },
    el('span', { class: 'marca-logo' }, icono('fragmento')),
    el('strong', { text: t('app.nombre') }),
  );
  const botones = SECCIONES.map(item => el('button', {
    type: 'button',
    class: ['nav-boton', item.id === seccion && 'activo'],
    attrs: { 'aria-current': item.id === seccion ? 'page' : null },
    on: { click: () => irA(item.id) },
  }, icono(item.icono), el('span', { text: t(item.clave) })));
  poner(nodos.navegacion, marca, el('div', { class: 'nav-lista' }, botones));
}

function pintar() {
  document.title = t('ajustes.tituloVentana');
  pintarNavegacion();
  const actual = SECCIONES.find(item => item.id === seccion) ?? SECCIONES[0];
  poner(nodos.panel, actual.pintar());
}

function irA(id) {
  seccion = id;
  pintar();
  nodos.panel.scrollTop = 0;
}

function leerHash() {
  if (location.hash === '#bienvenida') {
    activarBienvenida();
    seccion = 'atajos';
  } else if (SECCIONES.some(item => `#${item.id}` === location.hash)) {
    seccion = location.hash.slice(1);
  }
}

async function iniciar() {
  pagina.pintar = pintar;
  leerHash();
  const ajustes = await intentar(() => api.ajustesLeer());
  datos.ajustes = mezclarAjustes(datos.ajustes, ajustes ?? {});
  setIdioma(datos.ajustes.idioma);
  aplicarTema(datos.ajustes.tema);
  pintar();
  window.addEventListener('hashchange', () => {
    leerHash();
    pintar();
  });
}

iniciar();
