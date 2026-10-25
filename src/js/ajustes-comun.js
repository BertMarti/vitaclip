// Estado y piezas compartidas de la ventana de ajustes.

import * as api from './api.js';
import { el } from './dom.js';
import { t } from './i18n.js';
import { icono } from './iconos.js';
import { aviso, mostrarError, intentar } from './comun.js';
import { ATAJO_DEFECTO } from './atajos.js';

export const URL_REPO = 'https://github.com/BertMarti/vitaclip';
export const URL_LICENCIA_PRO = 'https://github.com/BertMarti/vitaclip/issues/new?title=Licencia%20Pro';
export const VERSION = '0.1.0';
export const LIMITE_GRATIS = 300;
export const LIMITE_PRO = 10000;

export const datos = {
  ajustes: {
    atajo: ATAJO_DEFECTO,
    tema: 'sistema',
    idioma: 'es',
    pegarAuto: true,
    arrancarConSistema: false,
    pausado: false,
    limiteHistorial: LIMITE_GRATIS,
    ignorar: [],
    ia: { proveedor: 'ollama', url: 'http://localhost:11434/v1', modelo: '', clave: '' },
  },
  licencia: { pro: false },
};

export const pagina = {
  pintar: () => {},
};

// Los guardados se encadenan para que nunca se pisen.
let cola = Promise.resolve(true);

async function guardarAhora(cambios) {
  const anterior = datos.ajustes;
  datos.ajustes = { ...anterior, ...cambios };
  try {
    const guardados = await api.ajustesGuardar(datos.ajustes);
    datos.ajustes = { ...datos.ajustes, ...(guardados ?? {}) };
    aviso(t('comun.guardado'), 'ok');
    return true;
  } catch (error) {
    datos.ajustes = anterior;
    mostrarError(error);
    pagina.pintar();
    return false;
  }
}

export function guardar(cambios) {
  cola = cola.then(() => guardarAhora(cambios));
  return cola;
}

export function esperarGuardados() {
  return cola;
}

// --- Piezas de interfaz

export function cabeceraSeccion(claveTitulo, claveDescripcion) {
  return el('header', { class: 'seccion-cabecera' },
    el('h1', { text: t(claveTitulo) }),
    claveDescripcion && el('p', { class: 'suave', text: t(claveDescripcion) }),
  );
}

export function filaAjuste(claveEtiqueta, claveDescripcion, control, extra = null) {
  return el('div', { class: 'fila-ajuste' },
    el('div', { class: 'fila-ajuste-texto' },
      el('span', { class: 'fila-ajuste-etiqueta', text: t(claveEtiqueta) }),
      claveDescripcion && el('span', { class: 'suave', text: t(claveDescripcion) }),
      extra,
    ),
    el('div', { class: 'fila-ajuste-control' }, control),
  );
}

export function interruptor(valor, alCambiar, etiqueta) {
  const entrada = el('input', {
    type: 'checkbox',
    checked: Boolean(valor),
    attrs: { role: 'switch', 'aria-label': etiqueta },
    on: { change: evento => alCambiar(evento.target.checked) },
  });
  return el('label', { class: 'interruptor' }, entrada, el('span', { class: 'interruptor-pista' }));
}

export function grupoAjustes(...filas) {
  return el('div', { class: 'grupo-ajustes' }, filas);
}

export function enlaceExterno(url, texto) {
  return el('a', {
    href: url,
    text: texto,
    attrs: { target: '_blank', rel: 'noopener noreferrer' },
  });
}

export function botonCopiar(texto) {
  return el('button', {
    type: 'button',
    class: 'boton boton-pequeno',
    text: t('comun.copiar'),
    on: {
      click: () => intentar(async () => {
        await navigator.clipboard.writeText(texto);
        aviso(t('comun.copiado'), 'ok');
      }),
    },
  });
}

export function lineaCodigo(texto) {
  return el('div', { class: 'linea-codigo' }, el('code', { text: texto }), botonCopiar(texto));
}

export function notaPro(claveTexto) {
  return el('p', { class: 'linea-bloqueada' }, icono('candado'), el('span', { text: t(claveTexto) }));
}
