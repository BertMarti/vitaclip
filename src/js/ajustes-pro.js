// Ajustes → IA (Pro), Licencia y Acerca de.

import * as api from './api.js';
import { el, poner } from './dom.js';
import { t } from './i18n.js';
import { icono } from './iconos.js';
import { aviso, boton, botonConfirmar, mensajeError, mostrarError, tarjetaPro } from './comun.js';
import {
  datos, pagina, guardar, esperarGuardados, cabeceraSeccion, filaAjuste, grupoAjustes,
  enlaceExterno, botonCopiar, URL_REPO, URL_LICENCIA_PRO, VERSION,
} from './ajustes-comun.js';

// Preajustes de proveedores compatibles con la API de OpenAI.
export const PROVEEDORES = [
  { id: 'ollama', url: 'http://localhost:11434/v1', modelo: 'llama3.2', ayuda: 'ia.ayuda.ollama' },
  { id: 'groq', url: 'https://api.groq.com/openai/v1', modelo: 'llama-3.3-70b-versatile', ayuda: 'ia.ayuda.groq' },
  { id: 'gemini', url: 'https://generativelanguage.googleapis.com/v1beta/openai', modelo: 'gemini-2.5-flash', ayuda: 'ia.ayuda.gemini' },
  { id: 'openrouter', url: 'https://openrouter.ai/api/v1', modelo: 'meta-llama/llama-3.3-70b-instruct:free', ayuda: 'ia.ayuda.openrouter' },
  { id: 'openai', url: 'https://api.openai.com/v1', modelo: 'gpt-4o-mini', ayuda: 'ia.ayuda.openai' },
  { id: 'personalizado', url: '', modelo: '', ayuda: 'ia.ayuda.personalizado' },
];

function proveedorDe(id) {
  return PROVEEDORES.find(proveedor => proveedor.id === id) ?? PROVEEDORES.at(-1);
}

function irALicencia() {
  location.hash = '#licencia';
}

// --- IA

function guardarIa(cambios) {
  return guardar({ ia: { ...datos.ajustes.ia, ...cambios } });
}

async function cambiarProveedor(id) {
  const anterior = proveedorDe(datos.ajustes.ia.proveedor);
  const nuevo = proveedorDe(id);
  const modelo = datos.ajustes.ia.modelo;
  const conservarModelo = modelo && modelo !== anterior.modelo;
  await guardarIa({
    proveedor: id,
    url: nuevo.id === 'personalizado' ? datos.ajustes.ia.url : nuevo.url,
    modelo: conservarModelo ? modelo : nuevo.modelo,
  });
  pagina.pintar();
}

function campoIa(clave, tipo, extra = {}) {
  return el('input', {
    type: tipo,
    class: ['campo', tipo !== 'password' && 'campo-mono'],
    value: datos.ajustes.ia[clave] ?? '',
    autocomplete: 'off',
    spellcheck: false,
    attrs: { 'aria-label': t(`ia.${clave}`) },
    on: { change: evento => guardarIa({ [clave]: evento.target.value.trim() }) },
    ...extra,
  });
}

function selectorProveedor() {
  const control = el('select', {
    class: 'campo',
    attrs: { 'aria-label': t('ia.proveedor') },
    on: { change: evento => cambiarProveedor(evento.target.value) },
  }, PROVEEDORES.map(proveedor => el('option', { value: proveedor.id, text: t(`ia.proveedores.${proveedor.id}`) })));
  control.value = proveedorDe(datos.ajustes.ia.proveedor).id;
  return control;
}

function botonProbar() {
  const resultado = el('p', { class: 'resultado-accion', attrs: { role: 'status' } });
  const accion = async () => {
    poner(resultado, el('span', { class: 'girando' }), t('ia.probando'));
    await esperarGuardados();
    try {
      const modelo = await api.iaProbar();
      poner(resultado, el('span', { class: 'ok-texto' }, icono('check'), t('ia.funciona', { modelo })));
    } catch (error) {
      poner(resultado, el('span', { class: 'error-texto', text: mensajeError(error) }));
      mostrarError(error);
    }
  };
  return el('div', { class: 'probar' }, boton(t('ia.probar'), accion, { clase: 'boton-primario', icono: 'chispa' }), resultado);
}

function formularioIa() {
  const proveedor = proveedorDe(datos.ajustes.ia.proveedor);
  const clave = datos.ajustes.ia.clave;
  const conjunto = el('fieldset', { class: 'conjunto', disabled: !datos.licencia.pro },
    grupoAjustes(
      filaAjuste('ia.proveedor', proveedor.ayuda, selectorProveedor()),
      filaAjuste('ia.url', 'ia.urlDescripcion', campoIa('url', 'url', { placeholder: proveedor.url || 'https://…/v1' })),
      filaAjuste('ia.modelo', 'ia.modeloDescripcion', campoIa('modelo', 'text', { placeholder: proveedor.modelo || t('ia.modeloPlaceholder') })),
      filaAjuste('ia.clave', clave ? 'ia.claveGuardada' : 'ia.claveDescripcion', campoIa('clave', 'password', { placeholder: proveedor.id === 'ollama' ? t('ia.sinClave') : 'sk-…' })),
    ),
    botonProbar(),
  );
  return conjunto;
}

export function seccionIa() {
  return [
    cabeceraSeccion('ajustes.ia', 'ia.descripcion'),
    !datos.licencia.pro && tarjetaPro('ia.proTitulo', ['ia.pro1', 'ia.pro2', 'ia.pro3'], irALicencia),
    formularioIa(),
    el('p', { class: 'suave', text: t('ia.privacidad') }),
  ];
}

// --- Licencia

function datoLicencia(clave, valor) {
  return el('div', { class: 'dato' }, el('dt', { text: t(clave) }), el('dd', { text: valor }));
}

function estadoLicencia() {
  const licencia = datos.licencia;
  if (!licencia.pro) {
    return el('div', { class: 'tarjeta-estado' },
      el('div', { class: 'tarjeta-estado-cabecera' }, icono('insignia'), el('strong', { text: t('licencia.gratis') })),
      el('p', { class: 'suave', text: t('licencia.gratisTexto') }),
      licencia.motivo && el('p', { class: 'error-texto', text: licencia.motivo }),
    );
  }
  return el('div', { class: 'tarjeta-estado activa' },
    el('div', { class: 'tarjeta-estado-cabecera' }, icono('insignia'), el('strong', { text: t('licencia.activa') }), el('span', { class: 'chip chip-pro', text: t('comun.pro') })),
    el('dl', { class: 'datos' },
      licencia.nombre && datoLicencia('licencia.nombre', licencia.nombre),
      licencia.email && datoLicencia('licencia.email', licencia.email),
      licencia.emitida && datoLicencia('licencia.emitida', licencia.emitida),
      datoLicencia('licencia.caduca', licencia.caduca || t('licencia.nunca')),
    ),
  );
}

async function activar(clave) {
  try {
    datos.licencia = (await api.licenciaActivar(clave)) ?? { pro: false };
    aviso(t(datos.licencia.pro ? 'licencia.activada' : 'licencia.noActivada'), datos.licencia.pro ? 'ok' : 'error');
  } catch (error) {
    mostrarError(error);
  }
  pagina.pintar();
}

async function quitar() {
  try {
    datos.licencia = (await api.licenciaQuitar()) ?? { pro: false };
    aviso(t('licencia.quitada'), 'ok');
  } catch (error) {
    mostrarError(error);
  }
  pagina.pintar();
}

function formularioActivar() {
  const area = el('textarea', {
    class: 'campo campo-mono',
    name: 'clave',
    rows: 3,
    spellcheck: false,
    placeholder: 'VITA1.…',
    attrs: { 'aria-label': t('licencia.pegar') },
  });
  const formulario = el('form', { class: 'bloque' },
    el('h3', { text: t('licencia.pegar') }),
    area,
    el('div', { class: 'botonera' }, el('button', { type: 'submit', class: 'boton boton-primario', text: t('licencia.activar') })),
  );
  formulario.addEventListener('submit', evento => {
    evento.preventDefault();
    const clave = area.value.trim();
    if (clave) {
      activar(clave);
    } else {
      area.focus();
    }
  });
  return formulario;
}

function queIncluye() {
  const puntos = ['licencia.incluye1', 'licencia.incluye2', 'licencia.incluye3', 'licencia.incluye4', 'licencia.incluye5'];
  return el('div', { class: 'bloque' },
    el('h3', { text: t('licencia.incluye') }),
    el('ul', { class: 'lista-pro' }, puntos.map(clave => el('li', {}, icono('check'), el('span', { text: t(clave) })))),
    el('p', { class: 'pedir-licencia' },
      el('span', { class: 'suave', text: t('licencia.pedirTexto') }),
      ' ',
      enlaceExterno(URL_LICENCIA_PRO, t('licencia.pedir')),
      ' ',
      botonCopiar(URL_LICENCIA_PRO),
    ),
  );
}

export function seccionLicencia() {
  return [
    cabeceraSeccion('ajustes.licencia', 'licencia.descripcion'),
    estadoLicencia(),
    datos.licencia.pro
      ? el('div', { class: 'botonera' }, botonConfirmar(t('licencia.quitar'), quitar))
      : formularioActivar(),
    queIncluye(),
  ];
}

// --- Acerca de

export function seccionAcerca() {
  return [
    cabeceraSeccion('ajustes.acerca', null),
    el('div', { class: 'acerca' },
      el('div', { class: 'marca-grande' }, icono('fragmento')),
      el('h2', { text: t('acerca.nombreVersion', { version: VERSION }) }),
      el('p', { class: 'suave', text: t('acerca.lema') }),
    ),
    grupoAjustes(
      filaAjuste('acerca.licenciaCodigo', 'acerca.licenciaTexto', el('span', { class: 'chip', text: t('acerca.licenciaNombre') })),
      filaAjuste('acerca.repositorio', 'acerca.repositorioTexto', enlaceExterno(URL_REPO, t('acerca.repoTexto'))),
      filaAjuste('acerca.privacidad', 'acerca.privacidadTexto', icono('escudo')),
    ),
  ];
}
