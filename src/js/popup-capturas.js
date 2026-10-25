// Pestaña Capturas: «Capturar zona» y «Grabar vídeo» (o «Detener · mm:ss» mientras graba), cada uno con su atajo,
// y la lista de capturas y vídeos recientes. Enter copia la imagen (o muestra el vídeo en su carpeta).

import * as api from './api.js';
import { el, poner } from './dom.js';
import { t, idiomaActual } from './i18n.js';
import { icono } from './iconos.js';
import { aviso, boton, intentar, legible } from './comun.js';
import { coincide, haceCuanto, resaltar } from './herramientas/buscar.js';
import { tamanoLegible, duracion, fechaHora } from './herramientas/formato.js';
import { estado } from './popup-estado.js';

const LIMITE_RECIENTES = 30;

let botonVideo = null;
let parando = false;

async function cargar(consulta) {
  const lista = await api.capturasRecientes(LIMITE_RECIENTES);
  return (lista ?? []).filter(archivo => coincide(archivo.nombre, consulta));
}

// --- Capturar y grabar

function capturar() {
  intentar(() => api.capturaIniciar('imagen'));
}

function grabar() {
  intentar(() => api.capturaIniciar('video'));
}

export async function pararVideo() {
  if (parando) {
    return;
  }
  parando = true;
  actualizarVideo();
  // La ruta llega también con el evento video-guardado, que es el que avisa.
  await intentar(() => api.videoParar());
  parando = false;
  actualizarVideo();
}

function contenidoBoton(nombreIcono, texto, atajo) {
  return [
    icono(nombreIcono),
    el('span', { class: 'boton-captura-textos' },
      el('span', { class: 'boton-captura-texto', text: texto }),
      atajo && el('kbd', { text: atajo }),
    ),
  ];
}

function rellenarBotonVideo() {
  const atajo = legible(estado.ajustes.atajos.video);
  const grabando = estado.video.grabando;
  botonVideo.classList.toggle('grabando', grabando);
  botonVideo.disabled = parando;
  botonVideo.title = t(grabando ? 'capturas.detener' : 'capturas.grabarTitulo');
  const texto = grabando ? t('capturas.detenerTiempo', { tiempo: duracion(estado.video.segundos) }) : t('capturas.grabar');
  poner(botonVideo, contenidoBoton(grabando ? 'detener' : 'grabar', texto, atajo));
}

// Se llama con cada evento video-estado: cambia el botón sin repintar la lista.
export function actualizarVideo() {
  if (botonVideo?.isConnected) {
    rellenarBotonVideo();
  }
}

function botonesCaptura() {
  const botonCaptura = el('button', {
    type: 'button',
    class: 'boton-captura',
    attrs: { title: t('capturas.capturarTitulo') },
    on: { click: capturar },
  }, contenidoBoton('captura', t('capturas.capturar'), legible(estado.ajustes.atajos.captura)));
  botonVideo = el('button', {
    type: 'button',
    class: 'boton-captura',
    on: { click: () => (estado.video.grabando ? pararVideo() : grabar()) },
  });
  rellenarBotonVideo();
  return el('div', { class: 'capturas-acciones' }, botonCaptura, botonVideo);
}

function abrirCarpeta(tipo) {
  intentar(() => api.carpetaAbrir(tipo));
}

function cabeceraLista() {
  return el('div', { class: 'capturas-cabecera' },
    botonesCaptura(),
    el('div', { class: 'barra-lista' },
      el('span', { class: 'suave', text: t('capturas.recientes') }),
      el('span', { class: 'barra-lista-botones' },
        boton(t('capturas.carpetaCapturas'), () => abrirCarpeta('capturas'), { icono: 'carpeta', clase: 'boton-pequeno', titulo: t('capturas.abrirCarpetaCapturas') }),
        boton(t('capturas.carpetaVideos'), () => abrirCarpeta('videos'), { icono: 'carpeta', clase: 'boton-pequeno', titulo: t('capturas.abrirCarpetaVideos') }),
      ),
    ),
  );
}

// --- Archivos recientes

async function mostrar(archivo) {
  await intentar(() => api.archivoMostrar(archivo.ruta));
}

async function copiarImagen(archivo) {
  const hecho = await intentar(async () => {
    await api.archivoCopiarImagen(archivo.ruta);
    return true;
  });
  if (hecho) {
    aviso(t('capturas.imagenCopiada'), 'ok');
  }
}

function resumen(archivo) {
  return `${tamanoLegible(archivo.tamano, idiomaActual())} · ${haceCuanto(archivo.creado, Date.now(), idiomaActual())}`;
}

function accionesFila(archivo) {
  const accion = (claveTitulo, nombreIcono, funcion) => el('button', {
    type: 'button',
    class: 'boton-icono',
    attrs: { title: t(claveTitulo), 'aria-label': t(claveTitulo) },
    on: { click: evento => { evento.stopPropagation(); funcion(archivo); } },
  }, icono(nombreIcono));
  return el('span', { class: 'fila-acciones' },
    archivo.tipo === 'imagen' && accion('capturas.copiar', 'copiar', copiarImagen),
    accion('capturas.mostrar', 'carpeta', mostrar),
  );
}

function fila(archivo, indice) {
  const nombre = resaltar(archivo.nombre, estado.consulta).map(parte => (
    parte.marcado ? el('mark', { text: parte.texto }) : parte.texto
  ));
  return el('div', { class: 'fila-clip fila-archivo', attrs: { title: archivo.ruta } },
    el('span', { class: 'fila-numero', text: indice < 9 ? String(indice + 1) : '' }),
    el('span', { class: 'icono-tipo' }, icono(archivo.tipo === 'video' ? 'video' : 'imagen')),
    el('span', { class: 'fila-texto' }, nombre),
    el('span', { class: 'fila-tiempo', text: resumen(archivo) }),
    accionesFila(archivo),
  );
}

function activar(archivo) {
  if (archivo.tipo === 'imagen') {
    copiarImagen(archivo);
  } else {
    mostrar(archivo);
  }
}

function detalle(archivo) {
  if (!archivo) {
    return null;
  }
  const esImagen = archivo.tipo === 'imagen';
  const datos = [
    t(esImagen ? 'capturas.imagen' : 'capturas.video'),
    tamanoLegible(archivo.tamano, idiomaActual()),
    fechaHora(archivo.creado, idiomaActual()),
  ];
  return el('div', { class: 'detalle-clip' },
    el('h3', { class: 'titulo-entrada', text: archivo.nombre }),
    el('p', { class: 'contadores', text: datos.join(' · ') }),
    el('p', { class: 'ruta', text: archivo.ruta }),
    el('div', { class: 'botonera' },
      esImagen && boton(t('capturas.copiar'), () => copiarImagen(archivo), { clase: 'boton-primario', icono: 'copiar', titulo: '↵', navegable: true }),
      boton(t('capturas.mostrar'), () => mostrar(archivo), { clase: esImagen ? '' : 'boton-primario', icono: 'carpeta', navegable: true }),
    ),
  );
}

function vacio() {
  return el('div', { class: 'vacio' },
    icono('captura'),
    el('p', { text: t(estado.consulta ? 'lista.sinResultados' : 'capturas.vacio') }),
  );
}

export const vistaCapturas = {
  cargar,
  clave: archivo => archivo.ruta,
  fila,
  detalle,
  activar,
  cabeceraLista,
  vacio,
  tituloPanel: archivo => t(archivo?.tipo === 'video' ? 'capturas.video' : 'capturas.imagen'),
  actualizarVideo,
};
