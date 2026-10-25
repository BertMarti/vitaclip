// IA en el panel de detalle (Pro): acciones rápidas, orden libre, indicador de carga y resultado pegable.
// Identificadores de acción que entiende Rust (ia_ejecutar):
//   traducir · resumir · corregir · formal · cercano · explicar_codigo · libre

import * as api from './api.js';
import { el, poner } from './dom.js';
import { t } from './i18n.js';
import { icono } from './iconos.js';
import { boton, mensajeError, mostrarError } from './comun.js';
import { estado, pegarTexto, abrirAjustes } from './popup-estado.js';

const ACCIONES_IA = [
  { id: 'traducir', clave: 'ia.traducir', extra: () => t('ia.destinoTraducir') },
  { id: 'resumir', clave: 'ia.resumir' },
  { id: 'corregir', clave: 'ia.corregir' },
  { id: 'formal', clave: 'ia.formal' },
  { id: 'cercano', clave: 'ia.cercano' },
  { id: 'explicar_codigo', clave: 'ia.explicarCodigo' },
];

// Un solo trabajo de IA a la vez, ligado al clip que lo pidió.
let trabajo = trabajoVacio(null);
let seccion = null;

function trabajoVacio(clipId) {
  return { clipId, cargando: false, etiqueta: '', resultado: null, error: null };
}

function titulo() {
  return el('h3', {},
    icono('chispa'),
    t('ia.titulo'),
    !estado.pro && el('span', { class: 'chip chip-pro', text: t('comun.pro') }),
  );
}

function botonAccion(clip, accion) {
  return el('button', {
    type: 'button',
    class: 'boton-herramienta navegable',
    text: t(accion.clave),
    disabled: trabajo.cargando,
    on: { click: () => ejecutar(clip, accion.id, accion.extra?.() ?? null, t(accion.clave)) },
  });
}

function formularioLibre(clip) {
  const entrada = el('input', {
    type: 'text',
    class: 'campo',
    placeholder: t('ia.pedirPlaceholder'),
    attrs: { 'aria-label': t('ia.pedir') },
  });
  const formulario = el('form', { class: 'ia-libre' },
    entrada,
    el('button', { type: 'submit', class: 'boton navegable', text: t('ia.pedir'), disabled: trabajo.cargando }),
  );
  formulario.addEventListener('submit', evento => {
    evento.preventDefault();
    const orden = entrada.value.trim();
    if (orden) {
      ejecutar(clip, 'libre', orden, orden);
    } else {
      entrada.focus();
    }
  });
  return formulario;
}

function zonaResultado() {
  if (trabajo.cargando) {
    return el('p', { class: 'ia-cargando' },
      el('span', { class: 'girando', attrs: { 'aria-hidden': 'true' } }),
      t('ia.pensando', { accion: trabajo.etiqueta }),
    );
  }
  if (trabajo.error) {
    return el('p', { class: 'error-texto', text: trabajo.error });
  }
  if (trabajo.resultado === null) {
    return null;
  }
  const texto = trabajo.resultado;
  return el('div', { class: 'ia-resultado' },
    el('div', { class: 'ia-resultado-cabecera', text: trabajo.etiqueta }),
    el('pre', { text: texto }),
    el('div', { class: 'botonera' },
      boton(t('detalle.pegar'), () => pegarTexto(texto), { clase: 'boton-primario navegable ia-pegar' }),
      boton(t('ia.descartar'), descartar, { clase: 'navegable' }),
    ),
  );
}

function descartar() {
  trabajo = trabajoVacio(trabajo.clipId);
  repintar();
}

function seccionBloqueada() {
  const botones = ACCIONES_IA.map(accion => el('button', {
    type: 'button',
    class: 'boton-herramienta',
    text: t(accion.clave),
    disabled: true,
  }));
  return [
    el('div', { class: 'rejilla-herramientas bloqueada' }, botones),
    el('p', { class: 'linea-bloqueada' },
      icono('candado'),
      el('span', { text: t('ia.bloqueada') }),
      boton(t('pro.ver'), abrirAjustes, { clase: 'boton-enlace navegable' }),
    ),
  ];
}

function contenido(clip) {
  if (!estado.pro) {
    return seccionBloqueada();
  }
  return [
    el('div', { class: 'rejilla-herramientas' }, ACCIONES_IA.map(accion => botonAccion(clip, accion))),
    formularioLibre(clip),
    zonaResultado(),
  ];
}

function repintar() {
  if (!seccion?.isConnected || !seccion.clip) {
    return;
  }
  poner(seccion, titulo(), contenido(seccion.clip));
  seccion.querySelector('.ia-pegar')?.focus();
}

async function ejecutar(clip, accion, extra, etiqueta) {
  trabajo = { ...trabajoVacio(clip.id), cargando: true, etiqueta };
  repintar();
  try {
    const resultado = await api.iaEjecutar(accion, clip.texto, extra);
    if (trabajo.clipId === clip.id) {
      trabajo = { ...trabajoVacio(clip.id), etiqueta, resultado: String(resultado ?? '') };
    }
  } catch (error) {
    mostrarError(error);
    if (trabajo.clipId === clip.id) {
      trabajo = { ...trabajoVacio(clip.id), etiqueta, error: mensajeError(error) };
    }
  }
  repintar();
}

export function seccionIa(clip) {
  if (trabajo.clipId !== clip.id) {
    trabajo = trabajoVacio(clip.id);
  }
  seccion = el('section', { class: 'seccion seccion-ia' });
  seccion.clip = clip;
  poner(seccion, titulo(), contenido(clip));
  return seccion;
}
