// Indicador de grabación (ventana `grabacion`, 220×44): punto rojo, tiempo mm:ss según `video-estado` y Detener.
// Se mueve arrastrando cualquier zona que no sea el botón.

import * as api from './api.js';
import { el, poner } from './dom.js';
import { t, setIdioma } from './i18n.js';
import { icono } from './iconos.js';
import { aplicarTema, intentar, hacerArrastrable } from './comun.js';
import { duracion } from './herramientas/formato.js';

const indicador = document.querySelector('#indicador');
const tiempo = el('span', { class: 'indicador-tiempo', attrs: { role: 'timer', 'aria-live': 'off' }, text: duracion(0) });
const boton = el('button', { type: 'button', class: 'boton-detener', on: { click: detener } });
let parando = false;

function pintarBoton() {
  boton.disabled = parando;
  poner(boton, icono('detener'), el('span', { text: t(parando ? 'grabacion.guardando' : 'grabacion.detener') }));
  boton.title = t('grabacion.detenerTitulo');
}

function mostrar(estado) {
  tiempo.textContent = duracion(estado?.segundos ?? 0);
}

async function detener() {
  if (parando) {
    return;
  }
  parando = true;
  pintarBoton();
  // Rust guarda el MP4, avisa con video-guardado y cierra esta ventana.
  await intentar(() => api.videoParar());
  parando = false;
  pintarBoton();
}

async function iniciar() {
  const ajustes = await intentar(() => api.ajustesLeer());
  setIdioma(ajustes?.idioma ?? 'es');
  aplicarTema(ajustes?.tema ?? 'sistema');
  document.title = t('grabacion.titulo');
  indicador.setAttribute('aria-label', t('grabacion.titulo'));
  pintarBoton();
  poner(indicador, el('span', { class: 'punto-rec', attrs: { 'aria-hidden': 'true' } }), tiempo, boton);
  hacerArrastrable(indicador);
  intentar(() => api.alEvento('video-estado', ({ payload }) => mostrar(payload)));
  mostrar(await intentar(() => api.videoEstado()));
}

iniciar();
