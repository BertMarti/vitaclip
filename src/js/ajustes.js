// Ventana de ajustes: navegación lateral, General y Atajo.
// Privacidad está en ajustes-privacidad.js; IA, Licencia y Acerca de, en ajustes-pro.js.
// Todo se guarda al momento con aviso «Guardado»; los errores se enseñan y se deshace el cambio.

import * as api from './api.js';
import { el, poner } from './dom.js';
import { t, setIdioma, idiomaActual } from './i18n.js';
import { icono } from './iconos.js';
import { aplicarTema, intentar, esMac, boton } from './comun.js';
import { ATAJO_DEFECTO, atajoDeEvento, atajoLegible, partesLegibles } from './atajos.js';
import {
  datos, pagina, guardar, cabeceraSeccion, filaAjuste, interruptor, grupoAjustes,
  lineaCodigo, notaPro, LIMITE_GRATIS, LIMITE_PRO,
} from './ajustes-comun.js';
import { seccionPrivacidad } from './ajustes-privacidad.js';
import { seccionIa, seccionLicencia, seccionAcerca } from './ajustes-pro.js';

const SECCIONES = [
  { id: 'general', clave: 'ajustes.general', icono: 'ajustes', pintar: seccionGeneral },
  { id: 'atajo', clave: 'ajustes.atajo', icono: 'teclado', pintar: seccionAtajo },
  { id: 'privacidad', clave: 'ajustes.privacidad', icono: 'escudo', pintar: seccionPrivacidad },
  { id: 'ia', clave: 'ajustes.ia', icono: 'chispa', pintar: seccionIa, pro: true },
  { id: 'licencia', clave: 'ajustes.licencia', icono: 'insignia', pintar: seccionLicencia },
  { id: 'acerca', clave: 'ajustes.acerca', icono: 'info', pintar: seccionAcerca },
];

const nodos = {
  navegacion: document.querySelector('#navegacion'),
  panel: document.querySelector('#panel'),
};

let seccion = 'general';
let bienvenida = false;

// --- General

function selector(valor, opciones, alCambiar, etiqueta) {
  const control = el('select', {
    class: 'campo',
    attrs: { 'aria-label': etiqueta },
    on: { change: evento => alCambiar(evento.target.value) },
  }, opciones.map(([id, clave]) => el('option', { value: id, text: t(clave) })));
  control.value = valor;
  return control;
}

function selectorTema() {
  const opciones = [['sistema', 'tema.sistema'], ['claro', 'tema.claro'], ['oscuro', 'tema.oscuro']];
  return el('div', { class: 'segmentado', attrs: { role: 'radiogroup', 'aria-label': t('ajustes.tema') } },
    opciones.map(([id, clave]) => el('button', {
      type: 'button',
      class: ['segmento', datos.ajustes.tema === id && 'activo'],
      text: t(clave),
      attrs: { role: 'radio', 'aria-checked': String(datos.ajustes.tema === id) },
      on: { click: () => cambiarTema(id) },
    })),
  );
}

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

function limiteMaximo() {
  return datos.licencia.pro ? LIMITE_PRO : LIMITE_GRATIS;
}

function controlLimite() {
  const maximo = limiteMaximo();
  return el('input', {
    type: 'number',
    class: 'campo campo-numero',
    min: 10,
    max: maximo,
    step: 10,
    value: Math.min(datos.ajustes.limiteHistorial, maximo),
    attrs: { 'aria-label': t('ajustes.limite') },
    on: {
      change: evento => {
        const numero = Math.round(Number(evento.target.value)) || LIMITE_GRATIS;
        const limite = Math.max(10, Math.min(maximo, numero));
        evento.target.value = limite;
        guardar({ limiteHistorial: limite });
      },
    },
  });
}

function seccionGeneral() {
  const a = datos.ajustes;
  return [
    cabeceraSeccion('ajustes.general', 'ajustes.generalDescripcion'),
    grupoAjustes(
      filaAjuste('ajustes.idioma', null, selector(a.idioma, [['es', 'idioma.es'], ['en', 'idioma.en']], cambiarIdioma, t('ajustes.idioma'))),
      filaAjuste('ajustes.tema', null, selectorTema()),
    ),
    grupoAjustes(
      filaAjuste('ajustes.pegarAuto', 'ajustes.pegarAutoDescripcion', interruptor(a.pegarAuto, valor => guardar({ pegarAuto: valor }), t('ajustes.pegarAuto'))),
      filaAjuste('ajustes.arrancar', 'ajustes.arrancarDescripcion', interruptor(a.arrancarConSistema, valor => guardar({ arrancarConSistema: valor }), t('ajustes.arrancar'))),
      filaAjuste('ajustes.pausar', 'ajustes.pausarDescripcion', interruptor(a.pausado, cambiarPausa, t('ajustes.pausar'))),
    ),
    grupoAjustes(
      filaAjuste('ajustes.limite', 'ajustes.limiteDescripcion', controlLimite(),
        !datos.licencia.pro && notaPro('ajustes.limiteGratis')),
    ),
  ];
}

// --- Atajo

function teclasDe(atajo) {
  const partes = partesLegibles(atajo, { mac: esMac, idioma: idiomaActual() });
  return partes.map(parte => el('kbd', { text: parte }));
}

function grabador() {
  const error = el('p', { class: 'error-texto', attrs: { role: 'alert' } });
  const caja = el('button', {
    type: 'button',
    class: 'grabador',
    attrs: { 'aria-label': t('atajo.grabar') },
  }, teclasDe(datos.ajustes.atajo));
  const parar = () => {
    caja.classList.remove('grabando');
    poner(caja, teclasDe(datos.ajustes.atajo));
  };
  caja.addEventListener('click', () => {
    caja.classList.add('grabando');
    poner(error);
    poner(caja, el('span', { class: 'suave', text: t('atajo.pulsa') }));
  });
  caja.addEventListener('blur', parar);
  caja.addEventListener('keydown', evento => alGrabar(evento, caja, error, parar));
  return el('div', { class: 'grabador-zona' }, caja, error);
}

async function alGrabar(evento, caja, error, parar) {
  if (!caja.classList.contains('grabando')) {
    return;
  }
  evento.preventDefault();
  evento.stopPropagation();
  if (evento.key === 'Escape' && !evento.ctrlKey && !evento.altKey && !evento.shiftKey && !evento.metaKey) {
    parar();
    return;
  }
  const resultado = atajoDeEvento(evento);
  if (resultado.pendiente) {
    return;
  }
  if (resultado.error) {
    error.textContent = t(`atajo.${resultado.error}`);
    return;
  }
  caja.classList.remove('grabando');
  if (await guardar({ atajo: resultado.atajo })) {
    bienvenida = false;
  }
  pintar();
}

function avisoBienvenida() {
  return el('div', { class: 'bienvenida' },
    el('div', { class: 'bienvenida-icono' }, icono('teclado')),
    el('div', {},
      el('strong', { text: t('atajo.bienvenidaTitulo') }),
      el('p', { text: t('atajo.bienvenidaTexto', { atajo: atajoLegible(ATAJO_DEFECTO, { mac: esMac, idioma: idiomaActual() }) }) }),
    ),
  );
}

function seccionAtajo() {
  return [
    cabeceraSeccion('ajustes.atajo', 'atajo.descripcion'),
    bienvenida && avisoBienvenida(),
    grupoAjustes(
      filaAjuste('atajo.actual', 'atajo.actualDescripcion', el('div', { class: 'atajo-controles' },
        grabador(),
        boton(t('atajo.restablecer'), async () => {
          await guardar({ atajo: ATAJO_DEFECTO });
          pintar();
        }, { clase: 'boton-pequeno' }),
      )),
    ),
    el('div', { class: 'tarjeta-info' },
      el('h3', { text: t('atajo.sistemaTitulo') }),
      el('p', { class: 'suave', text: t('atajo.sistemaTexto') }),
      lineaCodigo('vitaclip --mostrar'),
    ),
  ];
}

// --- Navegación y pintado

function pintarNavegacion() {
  const marca = el('div', { class: 'marca' },
    el('span', { class: 'marca-logo' }, icono('fragmento')),
    el('strong', { text: t('app.nombre') }),
    el('span', { class: ['chip', datos.licencia.pro ? 'chip-pro' : 'chip-gratis'], text: t(datos.licencia.pro ? 'comun.pro' : 'comun.gratis') }),
  );
  const botones = SECCIONES.map(item => el('button', {
    type: 'button',
    class: ['nav-boton', item.id === seccion && 'activo'],
    attrs: { 'aria-current': item.id === seccion ? 'page' : null },
    on: { click: () => irA(item.id) },
  }, icono(item.icono), el('span', { text: t(item.clave) }), item.pro && !datos.licencia.pro && icono('candado', 'icono-candado')));
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
    bienvenida = true;
    seccion = 'atajo';
  } else if (SECCIONES.some(item => `#${item.id}` === location.hash)) {
    seccion = location.hash.slice(1);
  }
}

async function iniciar() {
  pagina.pintar = pintar;
  leerHash();
  const [ajustes, licencia] = await Promise.all([
    intentar(() => api.ajustesLeer()),
    intentar(() => api.licenciaEstado()),
  ]);
  datos.ajustes = { ...datos.ajustes, ...(ajustes ?? {}) };
  datos.licencia = licencia ?? { pro: false };
  setIdioma(datos.ajustes.idioma);
  aplicarTema(datos.ajustes.tema);
  pintar();
  window.addEventListener('hashchange', () => {
    leerHash();
    pintar();
  });
}

iniciar();
