// Pestaña Fragmentos: lista, editor en el panel (nombre, abreviatura, contenido con variables) y pegado expandido.
// Los {campo:...} se piden en un mini formulario antes de pegar.

import * as api from './api.js';
import { el } from './dom.js';
import { t, idiomaActual } from './i18n.js';
import { icono } from './iconos.js';
import { aviso, boton, botonConfirmar, intentar } from './comun.js';
import { resaltar, vistaPrevia, coincide } from './herramientas/buscar.js';
import { expandir, campos, rellenar, VARIABLES } from './herramientas/variables.js';
import { estado, ui, pegarTexto, ultimoTexto, cargarFragmentos } from './popup-estado.js';

// Fragmento nuevo aún sin guardar (id 0 = nuevo para Rust).
let borrador = null;

function fragmentoVacio() {
  return { id: 0, nombre: '', abreviatura: '', contenido: '' };
}

function limpiarAbreviatura(texto) {
  return String(texto ?? '').trim().replace(/^;+/, '').replace(/\s+/g, '');
}

// --- Pegar

async function pegarExpandido(plantilla) {
  const portapapeles = plantilla.includes('{portapapeles}') ? await ultimoTexto() : '';
  const { texto } = expandir(plantilla, { portapapeles, idioma: idiomaActual() });
  await pegarTexto(texto);
}

function cerrarFormulario(capa) {
  capa.remove();
  ui.enfocarBuscador();
}

function campoDeFormulario(campo, indice) {
  const entrada = el('input', {
    type: 'text',
    class: 'campo',
    name: campo.nombre,
    value: campo.defecto,
    attrs: { id: `campo-${indice}`, autocomplete: 'off' },
  });
  return el('label', { class: 'etiqueta', attrs: { for: `campo-${indice}` } }, el('span', { text: campo.nombre }), entrada);
}

// Mini formulario para rellenar {campo:...}.
function pedirCampos(fragmento, lista) {
  const capa = el('div', { class: 'capa-modal' });
  const formulario = el('form', { class: 'dialogo', attrs: { role: 'dialog', 'aria-modal': 'true' } },
    el('h3', {}, icono('fragmento'), t('campos.titulo', { nombre: fragmento.nombre || t('fragmentos.sinNombre') })),
    el('p', { class: 'suave', text: t('campos.ayuda') }),
    lista.map(campoDeFormulario),
    el('div', { class: 'botonera' },
      el('button', { type: 'submit', class: 'boton boton-primario', text: t('detalle.pegar') }),
      boton(t('comun.cancelar'), () => cerrarFormulario(capa)),
    ),
  );
  formulario.addEventListener('keydown', evento => {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      evento.stopPropagation();
      cerrarFormulario(capa);
    }
  });
  formulario.addEventListener('submit', evento => {
    evento.preventDefault();
    const valores = Object.fromEntries(new FormData(formulario));
    capa.remove();
    pegarExpandido(rellenar(fragmento.contenido, valores));
  });
  capa.append(formulario);
  document.body.append(capa);
  formulario.querySelector('input')?.select();
}

export async function pegarFragmento(fragmento) {
  const lista = campos(fragmento.contenido);
  if (lista.length) {
    pedirCampos(fragmento, lista);
    return;
  }
  await pegarExpandido(fragmento.contenido);
}

// --- Lista

async function cargar(consulta) {
  await cargarFragmentos();
  const abreviatura = consulta.trimStart().startsWith(';') ? limpiarAbreviatura(consulta) : null;
  return estado.fragmentos.filter(fragmento => {
    if (abreviatura !== null) {
      return limpiarAbreviatura(fragmento.abreviatura).startsWith(abreviatura);
    }
    return coincide(`${fragmento.nombre} ${fragmento.abreviatura} ${fragmento.contenido}`, consulta);
  });
}

function marcado(texto) {
  return resaltar(texto, estado.consulta).map(parte => (
    parte.marcado ? el('mark', { text: parte.texto }) : parte.texto
  ));
}

function fila(fragmento, indice) {
  return el('div', { class: 'fila-clip' },
    el('span', { class: 'fila-numero', text: indice < 9 ? String(indice + 1) : '' }),
    el('span', { class: 'icono-tipo' }, icono(campos(fragmento.contenido).length ? 'hash' : 'fragmento')),
    el('span', { class: 'fila-texto' },
      el('strong', {}, marcado(fragmento.nombre || t('fragmentos.sinNombre'))),
      ' ',
      el('span', { class: 'suave' }, marcado(vistaPrevia(fragmento.contenido, 80))),
    ),
    fragmento.abreviatura && el('span', { class: 'chip chip-abreviatura', text: `;${limpiarAbreviatura(fragmento.abreviatura)}` }),
  );
}

function nuevo() {
  borrador = fragmentoVacio();
  ui.abrirPanel();
  document.querySelector('.editor input[name="nombre"]')?.focus();
}

function cabeceraLista() {
  return el('div', { class: 'barra-lista' },
    el('span', { class: 'suave', text: t('fragmentos.cuantos', { n: estado.fragmentos.length }) }),
    boton(t('fragmentos.nuevo'), nuevo, { icono: 'mas', clase: 'boton-pequeno', titulo: t('fragmentos.nuevoAtajo') }),
  );
}

function vacio() {
  if (estado.consulta) {
    return el('div', { class: 'vacio' }, icono('fragmento'), el('p', { text: t('lista.sinResultados') }));
  }
  return el('div', { class: 'vacio' },
    icono('fragmento'),
    el('p', { text: t('fragmentos.explicacion') }),
    boton(t('fragmentos.nuevo'), nuevo, { icono: 'mas', clase: 'boton-primario' }),
  );
}

// --- Editor

function chipVariable(nombre, area) {
  return el('button', {
    type: 'button',
    class: 'chip chip-variable',
    text: `{${nombre}}`,
    attrs: { title: t(`variables.${nombre}`) },
    on: { click: () => insertar(area, `{${nombre}}`) },
  });
}

function chipCampo(area) {
  return el('button', {
    type: 'button',
    class: 'chip chip-variable',
    text: '{campo:…}',
    attrs: { title: t('variables.campo') },
    on: { click: () => insertar(area, `{campo:${t('fragmentos.campoEjemplo')}}`) },
  });
}

function insertar(area, texto) {
  area.focus();
  area.setRangeText(texto, area.selectionStart, area.selectionEnd, 'end');
  area.dispatchEvent(new Event('input'));
}

function leerFormulario(formulario, original) {
  const datos = new FormData(formulario);
  return {
    id: original.id || 0,
    nombre: String(datos.get('nombre') ?? '').trim(),
    abreviatura: limpiarAbreviatura(datos.get('abreviatura')),
    contenido: String(datos.get('contenido') ?? ''),
  };
}

function validar(fragmento) {
  if (!fragmento.nombre) {
    return 'fragmentos.faltaNombre';
  }
  const repetida = fragmento.abreviatura && estado.fragmentos.some(otro => (
    otro.id !== fragmento.id && limpiarAbreviatura(otro.abreviatura) === fragmento.abreviatura
  ));
  return repetida ? 'fragmentos.abreviaturaRepetida' : null;
}

async function guardar(formulario, original) {
  const fragmento = leerFormulario(formulario, original);
  const problema = validar(fragmento);
  if (problema) {
    aviso(t(problema), 'error');
    return;
  }
  const guardado = await intentar(() => api.fragmentoGuardar(fragmento));
  if (!guardado) {
    return;
  }
  borrador = null;
  aviso(t('comun.guardado'), 'ok');
  await ui.recargar({ clave: guardado.id });
}

async function borrar(fragmento) {
  borrador = null;
  if (fragmento.id) {
    await intentar(() => api.fragmentoBorrar(fragmento.id));
  }
  ui.cerrarPanel();
  await ui.recargar({ mantener: false });
}

function campoTexto(nombre, valor, extra = {}) {
  return el('label', { class: 'etiqueta' },
    el('span', { text: t(`fragmentos.${nombre}`) }),
    el('input', { type: 'text', class: 'campo', name: nombre, value: valor, autocomplete: 'off', ...extra }),
  );
}

function editor(fragmento) {
  const area = el('textarea', { class: 'campo', name: 'contenido', rows: 5, value: fragmento.contenido, spellcheck: false });
  const formulario = el('form', { class: 'editor' },
    campoTexto('nombre', fragmento.nombre),
    el('label', { class: 'etiqueta' },
      el('span', { text: t('fragmentos.abreviatura') }),
      el('span', { class: 'campo-prefijo' },
        el('span', { class: 'prefijo', text: ';' }),
        el('input', { type: 'text', class: 'campo', name: 'abreviatura', value: limpiarAbreviatura(fragmento.abreviatura), placeholder: t('fragmentos.abreviaturaEjemplo'), autocomplete: 'off' }),
      ),
    ),
    el('label', { class: 'etiqueta' }, el('span', { text: t('fragmentos.contenido') }), area),
    el('div', { class: 'chips' }, VARIABLES.map(nombre => chipVariable(nombre, area)), chipCampo(area)),
    el('div', { class: 'botonera' },
      boton(t('detalle.pegar'), () => pegarFragmento(leerFormulario(formulario, fragmento)), { clase: 'boton-primario navegable' }),
      el('button', { type: 'submit', class: 'boton navegable', text: t('comun.guardar') }),
      botonConfirmar(t('detalle.borrar'), () => borrar(fragmento)),
    ),
  );
  formulario.addEventListener('submit', evento => {
    evento.preventDefault();
    guardar(formulario, fragmento);
  });
  return formulario;
}

// Vista breve para la fila «;abreviatura» del historial.
export function detalleFragmentoBreve(fragmento) {
  return el('div', { class: 'detalle-clip' },
    el('div', { class: 'detalle-meta' },
      el('span', { text: t('fragmentos.uno') }),
      el('span', { class: 'chip chip-abreviatura', text: `;${limpiarAbreviatura(fragmento.abreviatura)}` }),
    ),
    el('h3', { text: fragmento.nombre }),
    el('pre', { class: 'contenido-clip', text: fragmento.contenido }),
    el('div', { class: 'botonera' },
      boton(t('detalle.pegar'), () => pegarFragmento(fragmento), { clase: 'boton-primario navegable', titulo: '↵' }),
      boton(t('fragmentos.irEditar'), () => ui.cambiarPestana('fragmentos'), { clase: 'navegable' }),
    ),
  );
}

function detalle(fragmento) {
  if (borrador) {
    return editor(borrador);
  }
  return fragmento ? editor(fragmento) : null;
}

function tituloPanel(fragmento) {
  return t(borrador || !fragmento ? 'fragmentos.nuevoTitulo' : 'fragmentos.editar');
}

function teclas(evento) {
  const mod = evento.ctrlKey || evento.metaKey;
  if (mod && evento.code === 'KeyN') {
    evento.preventDefault();
    nuevo();
  }
}

export const vistaFragmentos = {
  cargar,
  clave: fragmento => fragmento.id,
  fila,
  detalle,
  activar: pegarFragmento,
  alSeleccionar: () => {
    borrador = null;
  },
  alCerrarPanel: () => {
    borrador = null;
  },
  tituloPanel,
  cabeceraLista,
  vacio,
  teclas,
};
