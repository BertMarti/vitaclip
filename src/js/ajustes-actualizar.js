// Panel de actualizaciones y aviso global de una versión nueva.

import * as api from './api.js';
import { el } from './dom.js';
import { t } from './i18n.js';
import { boton, intentar, mensajeError } from './comun.js';
import { datos, guardar, filaAjuste, grupoAjustes, interruptor, pagina } from './ajustes-comun.js';

let estado = { actual: '', disponible: null, comprobado: null, instalable: true, buscando: false };
let progreso = null;
let error = null;

function actualizarEstado(nuevo) {
  if (nuevo) estado = { ...estado, ...nuevo };
  pagina.pintar();
}

function haceCuando(milisegundos) {
  if (!milisegundos) return t('actualizaciones.aunNo');
  const minutos = Math.max(0, Math.floor((Date.now() - milisegundos) / 60000));
  if (minutos < 60) return t('actualizaciones.comprobadoMin', { n: minutos });
  return t('actualizaciones.comprobadoHora', { n: Math.floor(minutos / 60) });
}

async function buscar() {
  error = null;
  actualizarEstado({ buscando: true });
  try { actualizarEstado(await api.actualizacionBuscar()); } catch (e) { error = mensajeError(e); actualizarEstado({ buscando: false }); }
}

async function instalar() {
  error = null;
  progreso = { descargado: 0, total: null };
  actualizarEstado();
  try { await api.actualizacionInstalar(); } catch (e) { error = mensajeError(e); progreso = null; actualizarEstado(); }
}

export function avisoActualizacion() {
  const disponible = estado.disponible;
  if (!disponible && !error) return null;
  const porcentaje = progreso?.total ? Math.round(progreso.descargado * 100 / progreso.total) : 0;
  return el('aside', { class: 'aviso-actualizacion' },
    disponible && el('strong', { text: t('actualizaciones.nueva', { version: disponible.version }) }),
    error && el('p', { class: 'actualizacion-error', text: error }),
    progreso && el('div', { class: 'actualizacion-descarga' },
      el('progress', { max: 100, value: porcentaje, attrs: { 'aria-label': t('actualizaciones.descargando') } }),
      el('span', { text: t('actualizaciones.descargandoPorcentaje', { n: porcentaje }) }),
    ),
    disponible && !progreso && el('div', { class: 'botonera' },
      boton(t('actualizaciones.novedades'), () => intentar(() => api.actualizacionPagina())),
      estado.instalable
        ? boton(t('actualizaciones.instalar'), () => intentar(instalar), { clase: 'boton-primario' })
        : boton(t('actualizaciones.descargar'), () => intentar(() => api.actualizacionPagina()), { clase: 'boton-primario' }),
    ),
  );
}

export function seccionActualizaciones() {
  const a = datos.ajustes;
  const control = boton(estado.buscando ? t('actualizaciones.buscando') : t('actualizaciones.buscar'), buscar, { clase: 'boton-pequeno' });
  control.disabled = estado.buscando;
  const version = el('div', { class: 'fila-ajuste' },
    el('div', { class: 'fila-ajuste-texto' },
      el('span', { class: 'fila-ajuste-etiqueta', text: t('actualizaciones.version', { version: estado.actual }) }),
      el('span', { class: 'suave', text: haceCuando(estado.comprobado) }),
    ),
    el('div', { class: 'fila-ajuste-control' }, control, !estado.buscando && estado.comprobado && !estado.disponible && !error && el('span', { class: 'suave', text: t('actualizaciones.ultima') })),
  );
  return grupoAjustes(
    filaAjuste('actualizaciones.titulo', 'actualizaciones.descripcion', interruptor(a.buscarActualizaciones, valor => guardar({ buscarActualizaciones: valor }), t('actualizaciones.titulo'))),
    version,
  );
}

export async function iniciarActualizaciones() {
  try { actualizarEstado(await api.actualizacionEstado()); } catch (e) { error = mensajeError(e); }
  api.alEvento('actualizacion-disponible', evento => actualizarEstado({ disponible: evento.payload, buscando: false, comprobado: Date.now() }));
  api.alEvento('actualizacion-progreso', evento => { progreso = evento.payload; actualizarEstado(); });
}
