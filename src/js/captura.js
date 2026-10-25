// Editor de capturas tipo Lightshot (ventana `captura`, a pantalla completa en el monitor del ratón).
// Pinta la pantalla congelada con un velo; arrastrando en cualquier dirección se elige la zona (8 asas, mover
// por dentro, etiqueta «ancho × alto» en píxeles físicos). En modo imagen se anota y se copia o guarda;
// en modo vídeo se elige la zona (o pantalla completa) y empieza la grabación.

import * as api from './api.js';
import { el } from './dom.js';
import { t, setIdioma } from './i18n.js';
import { aplicarTema, aviso, intentar, mostrarError } from './comun.js';
import {
  normalizar, limitar, esValida, contiene, asaEn, mover, redimensionar, aFisicos, posicionBarra, posicionEtiqueta,
} from './herramientas/seleccion.js';
import { COLORES, GROSORES, esUtil, grosorPara } from './herramientas/dibujo.js';
import { pintarEscena, exportarPng } from './captura-lienzo.js';
import { abrirTexto } from './captura-texto.js';
import { crearBarra, marcarBarra, crearAyuda } from './captura-barra.js';

const CURSORES = {
  nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize',
  n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
};

const lienzo = document.querySelector('#lienzo');
const capa = document.querySelector('#capa');
const ctx = lienzo.getContext('2d');

const estado = {
  modo: 'imagen',
  info: null,
  imagen: null,
  escalaX: 1,
  escalaY: 1,
  seleccion: null,
  // {tipo: 'crear'|'mover'|'asa'|'dibujar', inicio, inicial, asa, anotacion}
  arrastre: null,
  herramienta: null,
  color: COLORES[0],
  grosor: GROSORES[1],
  anotaciones: [],
  texto: null,
  ocupado: false,
};

const nodos = { barra: null, ayuda: null, etiqueta: el('div', { class: 'etiqueta-tamano', attrs: { 'aria-live': 'polite' } }) };
let pintadoPendiente = false;
let turnoCarga = 0;

function ventana() {
  return { ancho: window.innerWidth, alto: window.innerHeight };
}

function acento() {
  return getComputedStyle(document.documentElement).getPropertyValue('--acento').trim() || '#84cc16';
}

// --- Pintado (agrupado por fotograma)

function pedirPintado() {
  if (!pintadoPendiente) {
    pintadoPendiente = true;
    requestAnimationFrame(pintar);
  }
}

function pintar() {
  pintadoPendiente = false;
  const { ancho, alto } = ventana();
  const arrastrando = estado.arrastre && estado.arrastre.tipo !== 'dibujar';
  pintarEscena(ctx, {
    ancho,
    alto,
    imagen: estado.imagen,
    seleccion: esValida(estado.seleccion, 1) ? estado.seleccion : null,
    anotaciones: estado.anotaciones,
    enCurso: estado.arrastre?.anotacion ?? null,
    mostrarAsas: !estado.arrastre || estado.arrastre.tipo === 'mover',
    acento: acento(),
  });
  colocarEtiqueta();
  colocarBarra(!arrastrando && esValida(estado.seleccion));
  nodos.ayuda?.classList.toggle('oculto', Boolean(estado.seleccion) || Boolean(estado.arrastre));
}

function colocarEtiqueta() {
  const { seleccion } = estado;
  nodos.etiqueta.classList.toggle('oculto', !esValida(seleccion, 1));
  if (!esValida(seleccion, 1)) {
    return;
  }
  const fisico = aFisicos(seleccion, estado.escalaX, estado.escalaY);
  nodos.etiqueta.textContent = t('captura.tamano', { ancho: fisico.ancho, alto: fisico.alto });
  const sitio = posicionEtiqueta(seleccion, { ancho: nodos.etiqueta.offsetWidth, alto: nodos.etiqueta.offsetHeight });
  nodos.etiqueta.style.transform = `translate(${Math.round(sitio.x)}px, ${Math.round(sitio.y)}px)`;
}

function colocarBarra(visible) {
  const { barra } = nodos;
  if (!barra) {
    return;
  }
  barra.classList.toggle('oculto', !visible);
  if (!visible) {
    return;
  }
  marcarBarra(barra, { ...estado, puedeDeshacer: estado.anotaciones.length > 0 });
  const sitio = posicionBarra(estado.seleccion, { ancho: barra.offsetWidth, alto: barra.offsetHeight }, ventana());
  barra.style.transform = `translate(${Math.round(sitio.x)}px, ${Math.round(sitio.y)}px)`;
  barra.dataset.lugar = sitio.lugar;
}

function ajustarLienzo() {
  const { ancho, alto } = ventana();
  const densidad = window.devicePixelRatio || 1;
  lienzo.width = Math.round(ancho * densidad);
  lienzo.height = Math.round(alto * densidad);
  ctx.setTransform(densidad, 0, 0, densidad, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  if (estado.imagen) {
    estado.escalaX = (estado.info?.ancho || estado.imagen.naturalWidth) / ancho;
    estado.escalaY = (estado.info?.alto || estado.imagen.naturalHeight) / alto;
  }
  pedirPintado();
}

// --- Texto temporal sobre el lienzo

function fijarTexto(guardarlo = true) {
  estado.texto?.fijar(guardarlo);
}

function empezarTexto(punto) {
  fijarTexto();
  const anotacion = { tipo: 'texto', x: punto.x, y: punto.y, texto: '', color: estado.color, grosor: grosorPara('texto', estado.grosor) };
  estado.texto = abrirTexto(capa, anotacion, terminada => {
    estado.texto = null;
    if (terminada && esUtil(terminada)) {
      estado.anotaciones.push(terminada);
    }
    pedirPintado();
  });
}

// --- Ratón

function puntoDe(evento) {
  const { ancho, alto } = ventana();
  return { x: Math.min(Math.max(evento.clientX, 0), ancho), y: Math.min(Math.max(evento.clientY, 0), alto) };
}

function nuevaAnotacion(punto) {
  const base = { tipo: estado.herramienta, color: estado.color, grosor: grosorPara(estado.herramienta, estado.grosor) };
  if (estado.herramienta === 'lapiz' || estado.herramienta === 'marcador') {
    return { ...base, puntos: [[punto.x, punto.y]] };
  }
  return { ...base, x1: punto.x, y1: punto.y, x2: punto.x, y2: punto.y };
}

function alPulsar(evento) {
  if (evento.button !== 0 || !estado.imagen || estado.ocupado) {
    return;
  }
  fijarTexto();
  const punto = puntoDe(evento);
  const { seleccion } = estado;
  const asa = asaEn(seleccion, punto.x, punto.y);
  let arrastre = { tipo: 'crear', inicio: punto };
  if (asa) {
    arrastre = { tipo: 'asa', asa, inicial: { ...seleccion }, inicio: punto };
  } else if (contiene(seleccion, punto.x, punto.y)) {
    if (estado.modo === 'imagen' && estado.herramienta === 'texto') {
      // Sin esto, el mousedown que sigue quita el foco al campo recién creado.
      evento.preventDefault();
      empezarTexto(punto);
      return;
    }
    arrastre = estado.modo === 'imagen' && estado.herramienta
      ? { tipo: 'dibujar', anotacion: nuevaAnotacion(punto), inicio: punto }
      : { tipo: 'mover', inicial: { ...seleccion }, inicio: punto };
  } else {
    estado.seleccion = null;
  }
  estado.arrastre = arrastre;
  lienzo.setPointerCapture(evento.pointerId);
  pedirPintado();
}

function cursorEn(punto) {
  const { seleccion } = estado;
  const asa = asaEn(seleccion, punto.x, punto.y);
  if (asa) return CURSORES[asa];
  if (!contiene(seleccion, punto.x, punto.y)) return 'crosshair';
  if (estado.modo !== 'imagen' || !estado.herramienta) return 'move';
  return estado.herramienta === 'texto' ? 'text' : 'crosshair';
}

function alMover(evento) {
  const punto = puntoDe(evento);
  const { arrastre } = estado;
  if (!arrastre) {
    lienzo.style.cursor = cursorEn(punto);
    return;
  }
  const limites = ventana();
  if (arrastre.tipo === 'crear') {
    estado.seleccion = limitar(normalizar(arrastre.inicio.x, arrastre.inicio.y, punto.x, punto.y), limites);
  } else if (arrastre.tipo === 'mover') {
    estado.seleccion = mover(arrastre.inicial, punto.x - arrastre.inicio.x, punto.y - arrastre.inicio.y, limites);
  } else if (arrastre.tipo === 'asa') {
    estado.seleccion = redimensionar(arrastre.inicial, arrastre.asa, punto.x, punto.y, limites);
  } else if (arrastre.anotacion.puntos) {
    arrastre.anotacion.puntos.push([punto.x, punto.y]);
  } else {
    Object.assign(arrastre.anotacion, { x2: punto.x, y2: punto.y });
  }
  pedirPintado();
}

function alSoltar() {
  const { arrastre } = estado;
  if (!arrastre) {
    return;
  }
  estado.arrastre = null;
  if (arrastre.tipo === 'dibujar' && esUtil(arrastre.anotacion)) {
    estado.anotaciones.push(arrastre.anotacion);
  }
  if (!esValida(estado.seleccion)) {
    estado.seleccion = null;
  }
  // Al soltar se pinta ya (sin esperar al siguiente fotograma) para que la barra esté lista al instante.
  pintar();
}

// --- Acciones

async function exportar() {
  fijarTexto();
  return exportarPng(estado.imagen, estado.seleccion, estado.anotaciones, estado.escalaX, estado.escalaY);
}

async function conOcupado(funcion) {
  if (estado.ocupado || !esValida(estado.seleccion)) {
    return;
  }
  estado.ocupado = true;
  document.body.classList.add('ocupado');
  try {
    await funcion();
  } catch (error) {
    mostrarError(error);
  } finally {
    estado.ocupado = false;
    document.body.classList.remove('ocupado');
  }
}

const acciones = {
  herramienta: id => {
    estado.herramienta = estado.herramienta === id ? null : id;
    pedirPintado();
  },
  color: color => {
    estado.color = color;
    pedirPintado();
  },
  grosor: grosor => {
    estado.grosor = grosor;
    pedirPintado();
  },
  deshacer: () => {
    estado.anotaciones.pop();
    pedirPintado();
  },
  copiar: () => conOcupado(async () => {
    await api.capturaCopiar(await exportar());
    aviso(t('captura.copiada'), 'ok');
  }),
  guardar: () => conOcupado(async () => {
    const ruta = await api.capturaGuardar(await exportar());
    aviso(t('captura.guardadaEn', { ruta }), 'ok', 4000);
  }),
  cerrar: () => intentar(() => api.capturaCancelar()),
  grabarZona: () => conOcupado(() => api.videoIniciar(aFisicos(estado.seleccion, estado.escalaX, estado.escalaY, estado.info))),
  pantallaCompleta: () => {
    if (!estado.ocupado) {
      estado.ocupado = true;
      intentar(() => api.videoIniciar(null)).finally(() => { estado.ocupado = false; });
    }
  },
};

function empujar(evento) {
  const pasos = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const paso = pasos[evento.key];
  if (!paso || !estado.seleccion) {
    return false;
  }
  const factor = evento.shiftKey ? 10 : 1;
  estado.seleccion = mover(estado.seleccion, paso[0] * factor, paso[1] * factor, ventana());
  pedirPintado();
  return true;
}

function alTeclado(evento) {
  const mod = evento.ctrlKey || evento.metaKey;
  // Enter sobre un botón de la barra es pulsar ese botón.
  if (evento.key === 'Enter' && evento.target instanceof Element && evento.target.closest('button')) {
    return;
  }
  if (evento.key === 'Escape') {
    evento.preventDefault();
    if (estado.arrastre) {
      estado.arrastre = null;
      pedirPintado();
    } else {
      acciones.cerrar();
    }
    return;
  }
  if (mod && evento.code === 'KeyZ' && estado.modo === 'imagen') {
    evento.preventDefault();
    acciones.deshacer();
    return;
  }
  if (estado.modo === 'imagen' && ((mod && evento.code === 'KeyC') || (evento.key === 'Enter' && !mod))) {
    evento.preventDefault();
    acciones.copiar();
    return;
  }
  if (estado.modo === 'imagen' && mod && evento.code === 'KeyS') {
    evento.preventDefault();
    acciones.guardar();
    return;
  }
  if (estado.modo === 'video' && evento.key === 'Enter') {
    evento.preventDefault();
    acciones.grabarZona();
    return;
  }
  if (estado.modo === 'video' && evento.code === 'KeyF' && !mod && !evento.altKey) {
    evento.preventDefault();
    acciones.pantallaCompleta();
    return;
  }
  if (!mod && empujar(evento)) {
    evento.preventDefault();
  }
}

// --- Carga de la pantalla congelada

function cargarImagen(url) {
  return new Promise((resolver, rechazar) => {
    const imagen = new Image();
    imagen.addEventListener('load', () => resolver(imagen));
    imagen.addEventListener('error', () => rechazar(new Error('imagen_captura')));
    imagen.src = url;
  });
}

function prepararModo(modo) {
  estado.modo = modo === 'video' ? 'video' : 'imagen';
  document.body.dataset.modo = estado.modo;
  nodos.barra?.remove();
  nodos.ayuda?.remove();
  nodos.barra = crearBarra(estado.modo, acciones);
  nodos.ayuda = crearAyuda(estado.modo, acciones);
  capa.append(nodos.barra, nodos.ayuda);
}

// info: {modo, ancho, alto, escala}. avisar = false en el primer intento (puede que aún no esté lista).
async function cargar(info = null, avisar = true) {
  const miTurno = ++turnoCarga;
  try {
    const datos = info ?? await api.capturaInfo();
    const imagen = await cargarImagen(await api.capturaImagen());
    if (miTurno !== turnoCarga) {
      return;
    }
    fijarTexto(false);
    Object.assign(estado, { info: datos, imagen, seleccion: null, arrastre: null, anotaciones: [], herramienta: null, ocupado: false });
    prepararModo(datos.modo);
    ajustarLienzo();
  } catch (error) {
    if (avisar) {
      mostrarError(error);
    }
  }
}

async function iniciar() {
  capa.append(nodos.etiqueta);
  const ajustes = await intentar(() => api.ajustesLeer());
  setIdioma(ajustes?.idioma ?? 'es');
  aplicarTema(ajustes?.tema ?? 'sistema');
  document.title = t('captura.tituloVentana');
  lienzo.addEventListener('pointerdown', alPulsar);
  lienzo.addEventListener('pointermove', alMover);
  lienzo.addEventListener('pointerup', alSoltar);
  lienzo.addEventListener('pointercancel', alSoltar);
  document.addEventListener('keydown', alTeclado);
  window.addEventListener('resize', ajustarLienzo);
  intentar(() => api.alEvento('captura-lista', ({ payload }) => cargar(payload?.modo ? payload : null)));
  await cargar(null, false);
}

iniciar();
