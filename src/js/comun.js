// Piezas compartidas por todas las ventanas: avisos, errores, tema, botones, atajos legibles y arrastre.

import * as api from './api.js';
import { el } from './dom.js';
import { t, existe, idiomaActual } from './i18n.js';
import { icono } from './iconos.js';
import { atajoLegible } from './atajos.js';

const DURACION_AVISO = 2600;

export const esMac = /Mac|iPhone|iPad/.test(globalThis.navigator?.platform ?? '');

// Tecla Ctrl o ⌘ según el sistema, para los textos de ayuda.
export const teclaMod = esMac ? '⌘' : 'Ctrl+';

// Atajo de Tauri en texto legible para este sistema e idioma ("" si está desactivado).
export function legible(atajo) {
  return atajoLegible(atajo, { mac: esMac, idioma: idiomaActual() });
}

const INTERACTIVOS = 'input, textarea, select, button, a, label, [role="tab"], .no-arrastrar';

// Al pulsar en una zona vacía de `zona` (no en controles) se mueve la ventana sin bordes.
export function hacerArrastrable(zona) {
  zona.addEventListener('mousedown', evento => {
    if (evento.button !== 0 || evento.target.closest(INTERACTIVOS)) {
      return;
    }
    evento.preventDefault();
    intentar(() => api.arrastrarVentana());
  });
}

let contenedorAvisos = null;

function zonaAvisos() {
  if (!contenedorAvisos || !contenedorAvisos.isConnected) {
    contenedorAvisos = el('div', { class: 'avisos', attrs: { role: 'status', 'aria-live': 'polite' } });
    document.body.append(contenedorAvisos);
  }
  return contenedorAvisos;
}

// Aviso efímero (toast). tipo: "info" | "ok" | "error".
export function aviso(texto, tipo = 'info', duracion = null) {
  const nodo = el('div', { class: ['aviso', `aviso-${tipo}`], text: texto });
  zonaAvisos().append(nodo);
  const espera = duracion ?? (tipo === 'error' ? DURACION_AVISO * 2 : DURACION_AVISO);
  setTimeout(() => nodo.remove(), espera);
}

// Los errores de Tauri llegan como cadena; los de las herramientas, como Error con clave de i18n.
export function mensajeError(error) {
  const mensaje = typeof error === 'string' ? error : error?.message;
  if (!mensaje) {
    return t('error.generico');
  }
  return existe(`error.${mensaje}`) ? t(`error.${mensaje}`) : mensaje;
}

export function mostrarError(error) {
  console.error(error);
  aviso(mensajeError(error), 'error');
}

export function aplicarTema(tema) {
  const raiz = document.documentElement;
  if (tema === 'claro' || tema === 'oscuro') {
    raiz.dataset.tema = tema;
  } else {
    delete raiz.dataset.tema;
  }
}

// Botón que pide una segunda pulsación antes de hacer algo destructivo.
export function botonConfirmar(etiqueta, accion, { clase = 'boton-peligro' } = {}) {
  let armado = false;
  let temporizador = null;
  const boton = el('button', { type: 'button', class: ['boton', clase], text: etiqueta });
  boton.addEventListener('click', async () => {
    if (!armado) {
      armado = true;
      boton.textContent = t('comun.confirmar');
      boton.classList.add('armado');
      temporizador = setTimeout(() => {
        armado = false;
        boton.textContent = etiqueta;
        boton.classList.remove('armado');
      }, 3000);
      return;
    }
    clearTimeout(temporizador);
    await accion();
  });
  return boton;
}

export function boton(etiqueta, accion, { clase = '', icono: nombreIcono = null, titulo = null, navegable = false } = {}) {
  return el('button', {
    type: 'button',
    class: ['boton', clase, navegable && 'navegable'],
    attrs: { title: titulo },
    on: { click: accion },
  }, nombreIcono && icono(nombreIcono), el('span', { text: etiqueta }));
}

// Ejecuta una promesa y enseña el error en un aviso (nunca se traga errores).
export async function intentar(funcion) {
  try {
    return await funcion();
  } catch (error) {
    mostrarError(error);
    return undefined;
  }
}
