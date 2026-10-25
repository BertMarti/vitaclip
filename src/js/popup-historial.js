// Pestaña Historial: lista de clips con cálculo y fragmentos por abreviatura como primeras filas.

import * as api from './api.js';
import { el } from './dom.js';
import { t, idiomaActual } from './i18n.js';
import { icono } from './iconos.js';
import { aviso, mostrarError } from './comun.js';
import { resaltar, vistaPrevia, haceCuanto, esUrl } from './herramientas/buscar.js';
import { esCalculo, calcular, formatear } from './herramientas/calcular.js';
import { detectar, aRgb } from './herramientas/color.js';
import { estado, pegarTexto, pegarClip, fijarClip, borrarClip } from './popup-estado.js';
import { detalleClip, detalleCalculo, imagenDeClip } from './popup-detalle.js';
import { pegarFragmento, detalleFragmentoBreve } from './popup-fragmentos.js';

// --- Filas especiales: cálculo y «;abreviatura»

function filaCalculo(consulta) {
  try {
    const valor = calcular(consulta);
    return { tipo: 'calculo', id: 'calculo', expresion: consulta.trim(), resultado: formatear(valor, idiomaActual()) };
  } catch (error) {
    return { tipo: 'calculo', id: 'calculo', expresion: consulta.trim(), error: error.message };
  }
}

function sinPuntoYComa(texto) {
  return String(texto ?? '').trim().replace(/^;/, '').toLocaleLowerCase('es');
}

function filasDeAbreviatura(consulta) {
  const buscada = sinPuntoYComa(consulta.split(/\s+/)[0]);
  return estado.fragmentos
    .filter(fragmento => sinPuntoYComa(fragmento.abreviatura).startsWith(buscada))
    .sort((a, b) => Number(sinPuntoYComa(b.abreviatura) === buscada) - Number(sinPuntoYComa(a.abreviatura) === buscada))
    .map(fragmento => ({ tipo: 'fragmento', id: `f${fragmento.id}`, fragmento }));
}

async function cargar(consulta) {
  if (esCalculo(consulta)) {
    return [filaCalculo(consulta)];
  }
  const especiales = consulta.trimStart().startsWith(';') ? filasDeAbreviatura(consulta.trim()) : [];
  const clips = await api.historialListar(consulta, 200);
  return [...especiales, ...(clips ?? [])];
}

// --- Iconos y miniaturas

const observador = new IntersectionObserver(alVerMiniaturas, { rootMargin: '80px' });

function alVerMiniaturas(entradas) {
  for (const entrada of entradas) {
    if (entrada.isIntersecting) {
      observador.unobserve(entrada.target);
      ponerMiniatura(entrada.target);
    }
  }
}

async function ponerMiniatura(contenedor) {
  const id = Number(contenedor.dataset.id);
  try {
    const url = await imagenDeClip(id);
    contenedor.append(el('img', { src: url, alt: '', attrs: { draggable: 'false' } }));
    contenedor.classList.add('cargada');
  } catch (error) {
    mostrarError(error);
  }
}

function miniatura(clip) {
  const contenedor = el('span', { class: 'miniatura', dataset: { id: String(clip.id) } }, icono('imagen'));
  observador.observe(contenedor);
  return contenedor;
}

function muestraColor(color) {
  const muestra = el('span', { class: 'muestra-mini' });
  muestra.style.backgroundColor = aRgb(color);
  return muestra;
}

function pareceCodigo(texto) {
  const recortado = texto.trim();
  return /^[{[]/.test(recortado) || /(=>|;\s*$|function\s|const\s|<\/?\w+>)/m.test(recortado);
}

function iconoClip(clip) {
  if (clip.tipo === 'imagen') return miniatura(clip);
  const color = detectar(clip.texto);
  if (color) return muestraColor(color);
  if (esUrl(clip.texto)) return el('span', { class: 'icono-tipo' }, icono('enlace'));
  if (pareceCodigo(clip.texto)) return el('span', { class: 'icono-tipo' }, icono('codigo'));
  return el('span', { class: 'icono-tipo' }, icono('texto'));
}

// --- Filas

function numero(indice) {
  return el('span', { class: 'fila-numero', text: indice < 9 ? String(indice + 1) : '' });
}

function textoResaltado(texto) {
  return resaltar(vistaPrevia(texto, 140), estado.consulta).map(parte => (
    parte.marcado ? el('mark', { text: parte.texto }) : parte.texto
  ));
}

function filaClip(clip, indice) {
  const principal = clip.tipo === 'imagen'
    ? el('span', { class: 'fila-texto suave', text: t('clip.imagenTamano', { ancho: clip.ancho ?? '?', alto: clip.alto ?? '?' }) })
    : el('span', { class: 'fila-texto' }, textoResaltado(clip.texto));
  return el('div', { class: 'fila-clip' },
    numero(indice),
    iconoClip(clip),
    principal,
    clip.fijado && el('span', { class: 'fila-fijado', attrs: { title: t('clip.fijado') } }, icono('fijado')),
    el('span', { class: 'fila-tiempo', text: haceCuanto(clip.usado || clip.creado, Date.now(), idiomaActual()) }),
  );
}

function filaDeCalculo(calculo, indice) {
  const texto = calculo.error ? t(`error.${calculo.error}`) : `= ${calculo.resultado}`;
  return el('div', { class: ['fila-clip', 'fila-calculo', calculo.error && 'con-error'] },
    numero(indice),
    el('span', { class: 'icono-tipo' }, icono('calculadora')),
    el('span', { class: 'fila-texto', text: texto }),
    el('span', { class: 'fila-tiempo', text: t('calculo.etiqueta') }),
  );
}

function filaDeFragmento(elemento, indice) {
  const { fragmento } = elemento;
  return el('div', { class: 'fila-clip fila-especial' },
    numero(indice),
    el('span', { class: 'icono-tipo' }, icono('fragmento')),
    el('span', { class: 'fila-texto' }, el('strong', { text: fragmento.nombre }), ' ', el('span', { class: 'suave', text: vistaPrevia(fragmento.contenido, 60) })),
    el('span', { class: 'chip chip-abreviatura', text: `;${sinPuntoYComa(fragmento.abreviatura)}` }),
  );
}

function fila(elemento, indice) {
  if (elemento.tipo === 'calculo') return filaDeCalculo(elemento, indice);
  if (elemento.tipo === 'fragmento') return filaDeFragmento(elemento, indice);
  return filaClip(elemento, indice);
}

// --- Acciones

function activar(elemento) {
  if (elemento.tipo === 'calculo') {
    if (elemento.error) {
      aviso(t(`error.${elemento.error}`), 'error');
      return;
    }
    pegarTexto(elemento.resultado);
    return;
  }
  if (elemento.tipo === 'fragmento') {
    pegarFragmento(elemento.fragmento);
    return;
  }
  pegarClip(elemento);
}

function esClip(elemento) {
  return elemento && (elemento.tipo === 'texto' || elemento.tipo === 'imagen');
}

function teclas(evento, elemento) {
  if (!esClip(elemento)) {
    return;
  }
  const mod = evento.ctrlKey || evento.metaKey;
  if (mod && evento.code === 'KeyP') {
    evento.preventDefault();
    fijarClip(elemento);
    return;
  }
  if (evento.key === 'Delete' && (!estado.consulta || evento.shiftKey)) {
    evento.preventDefault();
    borrarClip(elemento);
  }
}

function detalle(elemento) {
  if (!elemento) return null;
  if (elemento.tipo === 'calculo') return detalleCalculo(elemento);
  if (elemento.tipo === 'fragmento') return detalleFragmentoBreve(elemento.fragmento);
  return detalleClip(elemento);
}

function alSeleccionar(elemento) {
  if (esClip(elemento)) {
    estado.clipActual = elemento;
  }
}

function grupo(elemento) {
  if (!estado.consulta && esClip(elemento)) {
    return elemento.fijado ? t('grupo.fijados') : t('grupo.recientes');
  }
  return null;
}

export const vistaHistorial = {
  cargar: async consulta => {
    const elementos = await cargar(consulta);
    alSeleccionar(elementos.find(esClip));
    return elementos;
  },
  clave: elemento => elemento.id,
  fila,
  detalle: elemento => {
    alSeleccionar(elemento);
    return detalle(elemento);
  },
  activar,
  teclas,
  grupo,
};
