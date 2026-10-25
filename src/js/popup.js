// Popup de Vitaclip: marco (buscador, pestañas, pie), lista a todo el ancho, panel de detalle y eventos de Rust.
// Cada pestaña es una «vista» con la misma forma:
//   cargar(consulta) → elementos · fila(elemento, indice) · detalle(elemento) · activar(elemento)
//   opcionales: clave, pantalla(), cabeceraLista(), vacio(), teclas(evento, elemento), grupo(elemento),
//               tituloPanel(elemento), alSeleccionar(elemento), alCerrarPanel()
// El detalle no va al lado: se abre en un panel que sustituye a la lista (→, Tab o doble clic; ← o Esc vuelve).

import * as api from './api.js';
import { el, limpiar, poner } from './dom.js';
import { t, setIdioma } from './i18n.js';
import { icono } from './iconos.js';
import { aplicarTema, intentar, hacerArrastrable, aviso } from './comun.js';
import { completarAtajos } from './atajos.js';
import { estado, ui, elementoActual, cargarFragmentos, abrirAjustes } from './popup-estado.js';
import { nodos, pintarMarco, pintarPestanas, pintarPie, enfocarBuscador } from './popup-marco.js';
import { crearTeclado, primerNavegable } from './popup-teclado.js';
import { vistaHistorial } from './popup-historial.js';
import { vistaFragmentos } from './popup-fragmentos.js';
import { vistaCapturas } from './popup-capturas.js';
import { vistaBoveda } from './popup-boveda.js';

const VISTAS = {
  historial: vistaHistorial,
  fragmentos: vistaFragmentos,
  capturas: vistaCapturas,
  boveda: vistaBoveda,
};



let lista = null;
let panel = null;
let filas = [];
let turno = 0;
let historialPendiente = false;

function vistaActual() {
  return VISTAS[estado.pestana];
}

function claveDe(elemento) {
  return elemento ? (vistaActual().clave?.(elemento) ?? elemento.id) : null;
}

// --- Carga y pintado de la lista

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
  return vistaActual().vacio?.() ?? el('div', { class: 'vacio' },
    icono('buscar'),
    el('p', { text: t(estado.consulta ? 'lista.sinResultados' : 'lista.vacia') }),
  );
}

function crearFila(elemento, indice) {
  const fila = vistaActual().fila(elemento, indice);
  fila.classList.add('fila');
  fila.setAttribute('role', 'option');
  fila.addEventListener('click', () => {
    seleccionar(indice);
    enfocarBuscador();
  });
  fila.addEventListener('dblclick', () => {
    seleccionar(indice);
    abrirPanel();
  });
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
  const foco = indiceFoco();
  limpiar(nodos.contenido);
  const pantalla = vista.pantalla?.();
  if (pantalla) {
    estado.panel = false;
    lista = null;
    panel = null;
    filas = [];
    nodos.contenido.append(el('section', { class: 'pantalla' }, pantalla));
    pintarModo();
    return;
  }
  lista = el('div', { class: 'lista', attrs: { role: 'listbox', 'aria-label': t(`pestana.${estado.pestana}`) } });
  panel = el('section', { class: 'panel-detalle' });
  pintarFilas();
  nodos.contenido.append(el('div', { class: 'zona-lista' }, vista.cabeceraLista?.(), lista), panel);
  marcarSeleccion();
  // El panel tiene que verse antes de pintarlo: no se puede enfocar algo oculto.
  pintarModo();
  if (estado.panel) {
    pintarPanel({ enfocar: true, foco });
  }
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
  if (nuevo !== estado.indice) {
    estado.indice = nuevo;
    vistaActual().alSeleccionar?.(elementoActual());
  }
  marcarSeleccion();
}

function activar(indice = estado.indice) {
  const elemento = estado.elementos[indice];
  if (!elemento) {
    return;
  }
  seleccionar(indice);
  vistaActual().activar(elemento);
}

// --- Panel de detalle

function barraPanel(elemento) {
  const titulo = vistaActual().tituloPanel?.(elemento) ?? t(`pestana.${estado.pestana}`);
  return el('div', { class: 'barra-panel' },
    el('button', {
      type: 'button',
      class: 'boton-icono',
      attrs: { title: t('panel.volver'), 'aria-label': t('panel.volver') },
      on: { click: cerrarPanel },
    }, icono('volver')),
    el('span', { class: 'barra-panel-titulo', text: titulo }),
  );
}

// Posición del control enfocado dentro del panel (-1 si el foco está fuera).
function indiceFoco() {
  return panel ? [...panel.querySelectorAll('.navegable:not([disabled])')].indexOf(document.activeElement) : -1;
}

// Repinta el panel conservando el control que tenía el foco (por posición).
function pintarPanel({ enfocar = false, foco = indiceFoco() } = {}) {
  if (!panel) {
    return;
  }
  const elemento = elementoActual();
  const contenido = vistaActual().detalle(elemento);
  if (!contenido) {
    cerrarPanel();
    return;
  }
  poner(panel, barraPanel(elemento), el('div', { class: 'panel-cuerpo' }, contenido));
  const navegables = [...panel.querySelectorAll('.navegable:not([disabled])')];
  const destino = foco >= 0 ? navegables[Math.min(foco, navegables.length - 1)] : (enfocar && primerNavegable(panel));
  destino?.focus();
}

function abrirPanel() {
  if (!panel) {
    return;
  }
  estado.panel = true;
  pintarModo();
  pintarPanel({ enfocar: true });
  panel.querySelector('.panel-cuerpo')?.scrollTo(0, 0);
}

function cerrarPanel() {
  if (!estado.panel) {
    return;
  }
  estado.panel = false;
  vistaActual().alCerrarPanel?.();
  if (panel) {
    limpiar(panel);
  }
  pintarModo();
  marcarSeleccion();
  enfocarBuscador();
  if (historialPendiente) {
    historialPendiente = false;
    recargar({ mantener: true });
  }
}

function pintarModo() {
  nodos.contenido.classList.toggle('con-panel', estado.panel);
  pintarPie();
}

function cambiarPestana(id) {
  if (!VISTAS[id]) {
    return;
  }
  if (id !== estado.pestana || estado.panel) {
    if (estado.panel) {
      vistaActual().alCerrarPanel?.();
    }
    estado.pestana = id;
    estado.indice = 0;
    estado.panel = false;
    pintarPestanas();
    recargar();
  }
  enfocarBuscador();
}

function entrarPanel() {
  if (estado.panel) {
    primerNavegable(panel)?.focus();
    return;
  }
  const pantalla = nodos.contenido.querySelector('.pantalla');
  if (pantalla) {
    primerNavegable(pantalla)?.focus();
    return;
  }
  abrirPanel();
}

function escape() {
  if (estado.panel) {
    cerrarPanel();
    return;
  }
  if (nodos.buscador.value) {
    nodos.buscador.value = '';
    estado.consulta = '';
    recargar();
    return;
  }
  intentar(() => api.ventanaOcultar());
}

// Esc o ← desde el panel o un campo: vuelve a la lista.
function volver() {
  if (estado.panel) {
    cerrarPanel();
  } else {
    enfocarBuscador();
  }
}

function alEscribir() {
  estado.consulta = nodos.buscador.value;
  if (estado.panel) {
    vistaActual().alCerrarPanel?.();
    estado.panel = false;
  }
  recargar();
}

// --- Datos de entorno y eventos de Rust

async function refrescarEntorno() {
  const [ajustes, video] = await Promise.all([
    intentar(() => api.ajustesLeer()),
    intentar(() => api.videoEstado()),
  ]);
  estado.ajustes = { ...estado.ajustes, ...(ajustes ?? {}) };
  estado.ajustes.atajos = completarAtajos(estado.ajustes.atajos);
  estado.video = { grabando: false, segundos: 0, ...(video ?? {}) };
  setIdioma(estado.ajustes.idioma);
  aplicarTema(estado.ajustes.tema);
  pintarMarco();
}

async function alMostrarPopup() {
  nodos.buscador.value = '';
  estado.consulta = '';
  estado.pestana = 'historial';
  estado.indice = 0;
  estado.panel = false;
  await refrescarEntorno();
  await cargarFragmentos();
  await recargar();
  enfocarBuscador();
}

function alCambiarHistorial() {
  if (estado.pestana !== 'historial') {
    return;
  }
  // Con el panel abierto no se repinta (perdería el foco); se recarga al volver.
  if (estado.panel) {
    historialPendiente = true;
    return;
  }
  recargar({ mantener: true });
}

function alEstadoVideo({ payload }) {
  estado.video = { grabando: Boolean(payload?.grabando), segundos: Number(payload?.segundos) || 0 };
  pintarPie();
  if (estado.pestana === 'capturas') {
    vistaCapturas.actualizarVideo();
  }
}

function alTerminarVideo(texto, tipo) {
  aviso(texto, tipo);
  if (estado.pestana === 'capturas' && !estado.panel) {
    recargar({ mantener: true });
  }
}

function conectarEventos() {
  nodos.buscador.addEventListener('input', alEscribir);
  hacerArrastrable(nodos.cabecera);
  hacerArrastrable(nodos.pie);
  document.addEventListener('keydown', crearTeclado({
    mover: paso => seleccionar(estado.indice + paso),
    activar,
    entrarPanel,
    escape,
    volver,
    cambiarPestana,
    abrirAjustes,
    teclasVista: evento => vistaActual().teclas?.(evento, elementoActual()),
  }));
  intentar(() => api.alEvento('historial-cambiado', alCambiarHistorial));
  intentar(() => api.alEvento('popup-mostrado', alMostrarPopup));
  intentar(() => api.alEvento('video-estado', alEstadoVideo));
  intentar(() => api.alEvento('video-guardado', ({ payload }) => alTerminarVideo(t('capturas.videoGuardado', { ruta: payload?.ruta ?? '' }), 'ok')));
  intentar(() => api.alEvento('video-error', ({ payload }) => alTerminarVideo(payload?.mensaje || t('error.generico'), 'error')));
}

Object.assign(ui, {
  recargar,
  repintar: pintar,
  repintarDetalle: () => (estado.panel ? pintarPanel() : undefined),
  enfocarBuscador,
  cambiarPestana,
  seleccionar,
  abrirPanel,
  cerrarPanel,
});

async function iniciar() {
  pintarMarco();
  conectarEventos();
  await refrescarEntorno();
  await cargarFragmentos();
  await recargar();
  enfocarBuscador();
}

iniciar();
