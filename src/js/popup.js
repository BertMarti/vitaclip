// Popup de Vitaclip: marco (buscador, pestañas, pie), lista + detalle y eventos de Rust.
// Cada pestaña es una «vista» con la misma forma:
//   cargar(consulta) → elementos · fila(elemento) · detalle(elemento) · activar(elemento)
//   opcionales: clave(elemento), pantalla(), cabeceraLista(), vacio(), teclas(evento, elemento), grupo(elemento)

import * as api from './api.js';
import { el, limpiar, poner } from './dom.js';
import { t, setIdioma, idiomaActual } from './i18n.js';
import { icono } from './iconos.js';
import { aplicarTema, intentar, esMac } from './comun.js';
import { atajoLegible } from './atajos.js';
import { estado, ui, elementoActual, cargarFragmentos, cargarAcciones, abrirAjustes } from './popup-estado.js';
import { crearTeclado, primerNavegable } from './popup-teclado.js';
import { vistaHistorial } from './popup-historial.js';
import { vistaFragmentos } from './popup-fragmentos.js';
import { vistaHerramientas } from './popup-herramientas.js';
import { vistaBoveda } from './popup-boveda.js';

const VISTAS = {
  historial: vistaHistorial,
  fragmentos: vistaFragmentos,
  herramientas: vistaHerramientas,
  boveda: vistaBoveda,
};

const PESTANAS = [
  { id: 'historial', clave: 'pestana.historial', icono: 'reloj' },
  { id: 'fragmentos', clave: 'pestana.fragmentos', icono: 'fragmento' },
  { id: 'herramientas', clave: 'pestana.herramientas', icono: 'rayo' },
  { id: 'boveda', clave: 'pestana.boveda', icono: 'llave', pro: true },
];

const nodos = {
  buscador: document.querySelector('#buscador'),
  iconoBuscar: document.querySelector('#icono-buscar'),
  pestanas: document.querySelector('#pestanas'),
  contenido: document.querySelector('#contenido'),
  pie: document.querySelector('#pie'),
};

let lista = null;
let detalle = null;
let filas = [];
let turno = 0;

function vistaActual() {
  return VISTAS[estado.pestana];
}

function claveDe(elemento) {
  const vista = vistaActual();
  return elemento ? (vista.clave?.(elemento) ?? elemento.id) : null;
}

// --- Carga y pintado

function indiceTrasCargar(claveAnterior) {
  if (claveAnterior !== null) {
    const encontrado = estado.elementos.findIndex(elemento => claveDe(elemento) === claveAnterior);
    if (encontrado !== -1) {
      return encontrado;
    }
  }
  const tope = Math.max(0, estado.elementos.length - 1);
  return claveAnterior === null ? 0 : Math.min(estado.indice, tope);
}

// mantener: conserva el elemento elegido · clave: elige ese elemento tras cargar.
async function recargar({ mantener = false, clave = null } = {}) {
  const miTurno = ++turno;
  const anterior = clave ?? (mantener ? claveDe(elementoActual()) : null);
  const elementos = await intentar(() => vistaActual().cargar(estado.consulta));
  if (miTurno !== turno) {
    return;
  }
  estado.elementos = Array.isArray(elementos) ? elementos : [];
  estado.indice = indiceTrasCargar(anterior);
  pintar();
}

function filaVacia() {
  const vista = vistaActual();
  const propio = vista.vacio?.();
  if (propio) {
    return propio;
  }
  return el('div', { class: 'vacio' },
    icono('buscar'),
    el('p', { text: t(estado.consulta ? 'lista.sinResultados' : 'lista.vacia') }),
  );
}

function crearFila(elemento, indice) {
  const vista = vistaActual();
  const fila = vista.fila(elemento, indice);
  fila.classList.add('fila');
  fila.setAttribute('role', 'option');
  fila.addEventListener('click', () => {
    seleccionar(indice);
    enfocarBuscador();
  });
  fila.addEventListener('dblclick', () => activar(indice));
  return fila;
}

function pintarFilas() {
  const vista = vistaActual();
  filas = [];
  let grupoAnterior = null;
  estado.elementos.forEach((elemento, indice) => {
    const grupo = vista.grupo?.(elemento) ?? null;
    if (grupo && grupo !== grupoAnterior) {
      lista.append(el('div', { class: 'grupo', text: grupo }));
    }
    grupoAnterior = grupo;
    const fila = crearFila(elemento, indice);
    filas.push(fila);
    lista.append(fila);
  });
  if (!estado.elementos.length) {
    lista.append(filaVacia());
  }
}

function pintar() {
  const vista = vistaActual();
  limpiar(nodos.contenido);
  const pantalla = vista.pantalla?.();
  nodos.contenido.classList.toggle('completa', Boolean(pantalla));
  if (pantalla) {
    lista = null;
    detalle = null;
    filas = [];
    nodos.contenido.append(el('section', { class: 'pantalla' }, pantalla));
    return;
  }
  lista = el('div', { class: 'lista', attrs: { role: 'listbox', 'aria-label': t(`pestana.${estado.pestana}`) } });
  detalle = el('aside', { class: 'detalle' });
  pintarFilas();
  const columna = el('div', { class: 'columna-lista' }, vista.cabeceraLista?.(), lista);
  nodos.contenido.append(columna, detalle);
  marcarSeleccion();
  pintarDetalle();
}

function pintarDetalle() {
  if (!detalle) {
    return;
  }
  const elemento = elementoActual();
  const contenido = vistaActual().detalle(elemento);
  poner(detalle, contenido ?? el('div', { class: 'detalle-vacio', text: t('detalle.nada') }));
  detalle.scrollTop = 0;
}

function marcarSeleccion() {
  filas.forEach((fila, indice) => {
    const elegida = indice === estado.indice;
    fila.classList.toggle('seleccionada', elegida);
    fila.setAttribute('aria-selected', String(elegida));
  });
  filas[estado.indice]?.scrollIntoView({ block: 'nearest' });
}

function seleccionar(indice) {
  if (!estado.elementos.length) {
    return;
  }
  const nuevo = Math.max(0, Math.min(estado.elementos.length - 1, indice));
  const cambia = nuevo !== estado.indice;
  estado.indice = nuevo;
  marcarSeleccion();
  if (cambia) {
    vistaActual().alSeleccionar?.(elementoActual());
    pintarDetalle();
  }
}

function activar(indice = estado.indice) {
  const elemento = estado.elementos[indice];
  if (!elemento) {
    return;
  }
  if (indice !== estado.indice) {
    seleccionar(indice);
  }
  vistaActual().activar(elemento);
}

// --- Marco: pestañas, pie y buscador

function pintarPestanas() {
  limpiar(nodos.pestanas);
  PESTANAS.forEach((pestana, posicion) => {
    const bloqueada = pestana.pro && !estado.pro;
    const activa = pestana.id === estado.pestana;
    nodos.pestanas.append(el('button', {
      type: 'button',
      class: ['pestana', activa && 'activa', bloqueada && 'bloqueada'],
      attrs: {
        role: 'tab',
        'aria-selected': String(activa),
        title: t('pestana.atajo', { tecla: `${esMac ? '⌥' : 'Alt+'}${posicion + 1}` }),
        tabindex: '-1',
      },
      on: { click: () => cambiarPestana(pestana.id) },
    },
    icono(pestana.icono),
    el('span', { text: t(pestana.clave) }),
    bloqueada && icono('candado', 'icono-candado')));
  });
}

function tecla(texto) {
  return el('kbd', { text: texto });
}

function pintarPie() {
  const mod = esMac ? '⌘' : 'Ctrl+';
  const ayudas = el('div', { class: 'pie-ayudas' },
    tecla('↵'), ` ${t('pie.pegar')}`, el('span', { class: 'punto', text: '·' }),
    tecla(`${mod}P`), ` ${t('pie.fijar')}`, el('span', { class: 'punto', text: '·' }),
    tecla('Tab'), ` ${t('pie.herramientas')}`, el('span', { class: 'punto', text: '·' }),
    tecla('Esc'), ` ${t('pie.cerrar')}`,
  );
  const atajo = atajoLegible(estado.ajustes.atajo, { mac: esMac, idioma: idiomaActual() });
  const estadoPro = el('span', {
    class: ['chip', estado.pro ? 'chip-pro' : 'chip-gratis'],
    text: t(estado.pro ? 'comun.pro' : 'comun.gratis'),
  });
  const derecha = el('div', { class: 'pie-derecha' },
    el('span', { class: 'pie-atajo', attrs: { title: t('pie.atajoTitulo') } }, tecla(atajo)),
    estadoPro,
  );
  poner(nodos.pie, ayudas, derecha);
}

function pintarMarco() {
  nodos.buscador.placeholder = t('buscador.placeholder');
  nodos.buscador.setAttribute('aria-label', t('buscador.etiqueta'));
  poner(nodos.iconoBuscar, icono('buscar'));
  pintarPestanas();
  pintarPie();
}

function enfocarBuscador() {
  nodos.buscador.focus();
  const final = nodos.buscador.value.length;
  nodos.buscador.setSelectionRange(final, final);
}

function cambiarPestana(id) {
  if (!VISTAS[id]) {
    return;
  }
  if (id !== estado.pestana) {
    estado.pestana = id;
    estado.indice = 0;
    pintarPestanas();
    recargar();
  }
  enfocarBuscador();
}

function entrarPanel() {
  const contenedor = detalle ?? nodos.contenido.querySelector('.pantalla');
  const primero = contenedor && primerNavegable(contenedor);
  if (primero) {
    primero.focus();
    primero.scrollIntoView({ block: 'nearest' });
  }
}

function escape() {
  if (nodos.buscador.value) {
    nodos.buscador.value = '';
    estado.consulta = '';
    recargar();
    return;
  }
  intentar(() => api.ventanaOcultar());
}

function alEscribir() {
  estado.consulta = nodos.buscador.value;
  recargar();
}

// --- Datos de entorno y eventos

async function refrescarEntorno() {
  const [licencia, ajustes] = await Promise.all([
    intentar(() => api.licenciaEstado()),
    intentar(() => api.ajustesLeer()),
  ]);
  estado.licencia = licencia ?? { pro: false };
  estado.pro = Boolean(estado.licencia.pro);
  estado.ajustes = { ...estado.ajustes, ...(ajustes ?? {}) };
  setIdioma(estado.ajustes.idioma);
  aplicarTema(estado.ajustes.tema);
  pintarMarco();
}

async function alMostrarPopup() {
  nodos.buscador.value = '';
  estado.consulta = '';
  estado.pestana = 'historial';
  estado.indice = 0;
  await refrescarEntorno();
  await Promise.all([cargarFragmentos(), cargarAcciones()]);
  await recargar();
  enfocarBuscador();
}

function alCambiarHistorial() {
  if (estado.pestana === 'historial') {
    recargar({ mantener: true });
  }
}

function conectarEventos() {
  nodos.buscador.addEventListener('input', alEscribir);
  document.addEventListener('keydown', crearTeclado({
    mover: paso => seleccionar(estado.indice + paso),
    activar,
    entrarPanel,
    escape,
    cambiarPestana,
    enfocarBuscador,
    abrirAjustes,
    teclasVista: evento => vistaActual().teclas?.(evento, elementoActual()),
  }));
  intentar(() => api.alEvento('historial-cambiado', alCambiarHistorial));
  intentar(() => api.alEvento('popup-mostrado', alMostrarPopup));
}

Object.assign(ui, {
  recargar,
  repintar: pintar,
  repintarDetalle: pintarDetalle,
  enfocarBuscador,
  cambiarPestana,
  seleccionar,
});

async function iniciar() {
  pintarMarco();
  conectarEventos();
  await refrescarEntorno();
  await Promise.all([cargarFragmentos(), cargarAcciones()]);
  await recargar();
  enfocarBuscador();
}

iniciar();
