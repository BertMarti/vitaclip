// Editor de acciones personalizadas (Pro): nombre, pasos y prueba con el clip seleccionado.

import * as api from './api.js';
import { el } from './dom.js';
import { t } from './i18n.js';
import { icono } from './iconos.js';
import { aviso, boton, botonConfirmar, intentar, mensajeError } from './comun.js';
import { aplicarAccion, pasoVacio, TIPOS_PASO } from './herramientas/acciones.js';
import { TRANSFORMACIONES } from './herramientas/transformar.js';
import { vistaPrevia } from './herramientas/buscar.js';
import { estado, ui, pegarTexto, cargarAcciones } from './popup-estado.js';

// Copia en edición; se descarta al cambiar de elemento.
let borrador = null;

export function olvidarBorrador() {
  borrador = null;
}

function copiar(accion) {
  return JSON.parse(JSON.stringify(accion));
}

export function textoDePrueba() {
  const clip = estado.clipActual;
  return clip?.tipo === 'texto' ? clip.texto : '';
}

// Aplica la acción al clip seleccionado y pega el resultado.
export function ejecutarAccionSobreClip(accion) {
  const texto = textoDePrueba();
  if (!texto) {
    aviso(t('acciones.sinClip'), 'error');
    return;
  }
  try {
    pegarTexto(aplicarAccion(accion, texto));
  } catch (error) {
    aviso(mensajeError(error), 'error');
  }
}

// --- Campos de cada paso

function alCambiar(paso, clave, actualizar) {
  return evento => {
    paso[clave] = evento.target.value;
    actualizar();
  };
}

function entrada(paso, clave, etiqueta, actualizar, clase = '') {
  return el('label', { class: ['etiqueta', 'etiqueta-compacta', clase] },
    el('span', { text: t(etiqueta) }),
    el('input', {
      type: 'text',
      class: 'campo campo-mono',
      value: paso[clave] ?? '',
      spellcheck: false,
      on: { input: alCambiar(paso, clave, actualizar) },
    }),
  );
}

function selectorTransformacion(paso, actualizar) {
  const selector = el('select', { class: 'campo', on: { change: alCambiar(paso, 'id', actualizar) } },
    TRANSFORMACIONES.map(({ id, clave }) => el('option', { value: id, text: t(clave) })),
  );
  selector.value = paso.id;
  return el('label', { class: 'etiqueta etiqueta-compacta' }, el('span', { text: t('acciones.transformacion') }), selector);
}

function camposPaso(paso, actualizar) {
  switch (paso.tipo) {
    case 'regex':
      return el('div', { class: 'paso-campos paso-regex' },
        entrada(paso, 'buscar', 'acciones.buscar', actualizar),
        entrada(paso, 'reemplazar', 'acciones.reemplazar', actualizar),
        entrada(paso, 'flags', 'acciones.flags', actualizar, 'etiqueta-flags'),
      );
    case 'transformar':
      return el('div', { class: 'paso-campos' }, selectorTransformacion(paso, actualizar));
    default:
      return el('div', { class: 'paso-campos' }, entrada(paso, 'texto', 'acciones.texto', actualizar));
  }
}

// --- Lista de pasos

function moverPaso(indice, salto) {
  const destino = indice + salto;
  if (destino < 0 || destino >= borrador.pasos.length) {
    return;
  }
  const [paso] = borrador.pasos.splice(indice, 1);
  borrador.pasos.splice(destino, 0, paso);
  ui.repintarDetalle();
}

function quitarPaso(indice) {
  borrador.pasos.splice(indice, 1);
  ui.repintarDetalle();
}

function cambiarTipo(indice, tipo) {
  borrador.pasos[indice] = pasoVacio(tipo);
  ui.repintarDetalle();
}

function botonIcono(texto, titulo, accion, desactivado = false) {
  return el('button', {
    type: 'button',
    class: 'boton-icono',
    text: texto,
    disabled: desactivado,
    attrs: { title: t(titulo), 'aria-label': t(titulo) },
    on: { click: accion },
  });
}

function cabeceraPaso(paso, indice, total) {
  const tipo = el('select', { class: 'campo campo-tipo', on: { change: evento => cambiarTipo(indice, evento.target.value) } },
    TIPOS_PASO.map(nombre => el('option', { value: nombre, text: t(`acciones.tipo.${nombre}`) })),
  );
  tipo.value = paso.tipo;
  return el('div', { class: 'paso-cabecera' },
    el('span', { class: 'paso-numero', text: String(indice + 1) }),
    tipo,
    botonIcono('↑', 'acciones.subir', () => moverPaso(indice, -1), indice === 0),
    botonIcono('↓', 'acciones.bajar', () => moverPaso(indice, 1), indice === total - 1),
    botonIcono('×', 'acciones.quitar', () => quitarPaso(indice)),
  );
}

function listaPasos(actualizar) {
  if (!borrador.pasos.length) {
    return el('p', { class: 'suave', text: t('acciones.sinPasos') });
  }
  return el('ol', { class: 'pasos' }, borrador.pasos.map((paso, indice) => el('li', { class: 'paso' },
    cabeceraPaso(paso, indice, borrador.pasos.length),
    camposPaso(paso, actualizar),
  )));
}

function anadirPaso() {
  borrador.pasos.push(pasoVacio('regex'));
  ui.repintarDetalle();
}

// --- Probar con el clip seleccionado

function zonaPrueba() {
  const salida = el('pre', { class: 'prueba-salida' });
  const entradaTexto = textoDePrueba();
  const actualizar = () => {
    if (!entradaTexto) {
      salida.textContent = t('acciones.sinClip');
      return;
    }
    try {
      salida.textContent = aplicarAccion(borrador, entradaTexto);
      salida.classList.remove('error-texto');
    } catch (error) {
      salida.textContent = mensajeError(error);
      salida.classList.add('error-texto');
    }
  };
  const nodo = el('section', { class: 'prueba' },
    el('h4', { text: t('acciones.probar') }),
    el('p', { class: 'prueba-entrada', text: entradaTexto ? vistaPrevia(entradaTexto, 90) : '—' }),
    salida,
    boton(t('acciones.pegarResultado'), () => ejecutarAccionSobreClip(borrador), { clase: 'navegable', icono: 'rayo' }),
  );
  actualizar();
  return { nodo, actualizar };
}

// --- Guardar y borrar

function validar() {
  if (!borrador.nombre.trim()) {
    return 'acciones.faltaNombre';
  }
  try {
    aplicarAccion(borrador, 'prueba');
    return null;
  } catch (error) {
    return `error.${error.message}`;
  }
}

async function guardar() {
  const problema = validar();
  if (problema) {
    aviso(t(problema), 'error');
    return;
  }
  const accion = { id: borrador.id || 0, nombre: borrador.nombre.trim(), pasos: borrador.pasos };
  const guardada = await intentar(() => api.accionGuardar(accion));
  if (!guardada) {
    return;
  }
  borrador = null;
  aviso(t('comun.guardado'), 'ok');
  await cargarAcciones();
  await ui.recargar({ clave: `a${guardada.id}` });
}

async function borrar() {
  if (borrador.id) {
    await intentar(() => api.accionBorrar(borrador.id));
    await cargarAcciones();
  }
  borrador = null;
  await ui.recargar();
}

export function editorAccion(accion) {
  if (!borrador || borrador.id !== accion.id) {
    borrador = copiar(accion);
  }
  const prueba = zonaPrueba();
  const nombre = el('input', {
    type: 'text',
    class: 'campo',
    name: 'nombre',
    value: borrador.nombre,
    placeholder: t('acciones.nombreEjemplo'),
    on: { input: evento => { borrador.nombre = evento.target.value; } },
  });
  const formulario = el('form', { class: 'editor' },
    el('h3', {}, icono('rayo'), t(accion.id ? 'acciones.editar' : 'acciones.nueva')),
    el('label', { class: 'etiqueta' }, el('span', { text: t('acciones.nombre') }), nombre),
    el('div', { class: 'subtitulo', text: t('acciones.pasos') }),
    listaPasos(prueba.actualizar),
    boton(t('acciones.anadirPaso'), anadirPaso, { icono: 'mas', clase: 'boton-pequeno navegable' }),
    prueba.nodo,
    el('div', { class: 'botonera' },
      el('button', { type: 'submit', class: 'boton boton-primario navegable', text: t('comun.guardar') }),
      botonConfirmar(t('detalle.borrar'), borrar),
    ),
  );
  formulario.addEventListener('submit', evento => {
    evento.preventDefault();
    guardar();
  });
  return formulario;
}

export function resumenPasos(accion) {
  const total = accion.pasos?.length ?? 0;
  return t(total === 1 ? 'acciones.unPaso' : 'acciones.nPasos', { n: total });
}

export function enfocarNombre(contenedor) {
  contenedor?.querySelector('input[name="nombre"]')?.focus();
}
