// Ajustes → IA (cualquier API compatible con OpenAI) y Acerca de.

import * as api from './api.js';
import { el, poner } from './dom.js';
import { t } from './i18n.js';
import { icono } from './iconos.js';
import { boton, mensajeError, mostrarError } from './comun.js';
import {
  datos, pagina, guardar, esperarGuardados, cabeceraSeccion, filaAjuste, grupoAjustes,
  enlaceExterno, URL_REPO, VERSION,
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

// --- IA

function guardarIa(cambios) {
  return guardar({ ia: { ...datos.ajustes.ia, ...cambios } });
}

async function cambiarProveedor(id) {
  const anterior = proveedorDe(datos.ajustes.ia.proveedor);
  const nuevo = proveedorDe(id);
  const modelo = datos.ajustes.ia.modelo;
  const conservarModelo = modelo && modelo !== anterior.modelo;
  const url = nuevo.id === 'personalizado' ? datos.ajustes.ia.url : nuevo.url;
  await guardarIa({
    proveedor: id,
    url,
    modelo: conservarModelo ? modelo : nuevo.modelo,
    // La clave de un proveedor nunca se manda a otro: al cambiar de servidor hay que volver a escribirla.
    ...(url !== datos.ajustes.ia.url && { clave: '' }),
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
  const conjunto = el('fieldset', { class: 'conjunto' },
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
    formularioIa(),
    el('p', { class: 'suave', text: t('ia.privacidad') }),
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
      filaAjuste('acerca.codigo', 'acerca.codigoTexto', el('span', { class: 'chip', text: t('acerca.mit') })),
      filaAjuste('acerca.repositorio', 'acerca.repositorioTexto', enlaceExterno(URL_REPO, t('acerca.repoTexto'))),
      filaAjuste('acerca.privacidad', 'acerca.privacidadTexto', icono('escudo')),
    ),
  ];
}
