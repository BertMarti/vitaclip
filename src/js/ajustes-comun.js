// Estado y piezas compartidas de la ventana de ajustes.

import * as api from './api.js';
import { el } from './dom.js';
import { t } from './i18n.js';
import { aviso, mostrarError, intentar } from './comun.js';
import { ATAJOS_DEFECTO } from './atajos.js';

export const URL_REPO = 'https://github.com/BertMarti/vitaclip';
export const VERSION = '0.2.2';
export const LIMITE_MINIMO = 10;
export const LIMITE_MAXIMO = 10000;
export const LIMITE_DEFECTO = 500;

// Valores por defecto del contrato (Ajustes en camelCase); lo que llegue de Rust los sustituye.
export const datos = {
  ajustes: {
    atajos: { ...ATAJOS_DEFECTO },
    ventana: { modo: 'raton', x: null, y: null, ancho: 380, alto: 480 },
    capturas: { carpeta: '' },
    video: { carpeta: '', fps: 30, calidad: 'alta' },
    tema: 'sistema',
    idioma: 'es',
    pegarAuto: true,
    arrancarConSistema: false,
    pausado: false,
    limiteHistorial: LIMITE_DEFECTO,
    ignorar: [],
    ia: { proveedor: 'ollama', url: 'http://localhost:11434/v1', modelo: '', clave: '' },
  },
};

export const pagina = {
  pintar: () => {},
};

// Mezcla lo leído de Rust con los valores por defecto, también dentro de los objetos anidados.
export function mezclarAjustes(base, nuevos = {}) {
  const salida = { ...base, ...nuevos };
  for (const clave of ['atajos', 'ventana', 'capturas', 'video', 'ia']) {
    salida[clave] = { ...base[clave], ...(nuevos?.[clave] ?? {}) };
  }
  // El campo `atajo` de la 0.1 ya no existe (Rust lo migra a atajos.popup).
  delete salida.atajo;
  return salida;
}

// Los guardados se encadenan para que nunca se pisen. Devuelven true o el mensaje de error.
let cola = Promise.resolve(true);

async function guardarAhora(cambios) {
  const anterior = datos.ajustes;
  datos.ajustes = { ...anterior, ...cambios };
  try {
    const guardados = await api.ajustesGuardar(datos.ajustes);
    datos.ajustes = mezclarAjustes(datos.ajustes, guardados ?? {});
    aviso(t('comun.guardado'), 'ok');
    return true;
  } catch (error) {
    datos.ajustes = anterior;
    mostrarError(error);
    pagina.pintar();
    return typeof error === 'string' ? error : (error?.message || t('error.generico'));
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

// Desplegable: opciones = [[valor, claveDeTexto], …].
export function selector(valor, opciones, alCambiar, etiqueta) {
  const control = el('select', {
    class: 'campo',
    attrs: { 'aria-label': etiqueta },
    on: { change: evento => alCambiar(evento.target.value) },
  }, opciones.map(([id, clave]) => el('option', { value: String(id), text: t(clave) })));
  control.value = String(valor);
  return control;
}

// Botones segmentados: opciones = [[valor, claveDeTexto], …].
export function segmentado(valor, opciones, alCambiar, etiqueta) {
  return el('div', { class: 'segmentado', attrs: { role: 'radiogroup', 'aria-label': etiqueta } },
    opciones.map(([id, clave]) => el('button', {
      type: 'button',
      class: ['segmento', valor === id && 'activo'],
      text: t(clave),
      attrs: { role: 'radio', 'aria-checked': String(valor === id) },
      on: { click: () => alCambiar(id) },
    })),
  );
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
