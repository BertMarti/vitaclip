// Estado compartido del popup y acciones comunes (pegar, refrescar datos).
// popup.js rellena `ui` con las funciones de pintado para que las vistas puedan pedirlas.

import * as api from './api.js';
import { t } from './i18n.js';
import { aviso, intentar, esMac } from './comun.js';
import { ATAJO_DEFECTO } from './atajos.js';

export const estado = {
  pestana: 'historial',
  consulta: '',
  elementos: [],
  indice: 0,
  pro: false,
  licencia: { pro: false },
  ajustes: { atajo: ATAJO_DEFECTO, tema: 'sistema', idioma: 'es' },
  fragmentos: [],
  acciones: [],
  // Último clip elegido en el historial: lo usan las acciones personalizadas.
  clipActual: null,
};

export const ui = {
  recargar: async () => {},
  repintar: () => {},
  repintarDetalle: () => {},
  enfocarBuscador: () => {},
  cambiarPestana: () => {},
};

export function elementoActual() {
  return estado.elementos[estado.indice] ?? null;
}

function avisarSiSoloCopiado(resultado) {
  if (resultado === false) {
    aviso(t('aviso.copiado', { tecla: esMac ? '⌘V' : 'Ctrl+V' }));
  }
}

export async function pegarTexto(texto) {
  const resultado = await intentar(() => api.textoPegar(String(texto)));
  avisarSiSoloCopiado(resultado);
}

export async function pegarClip(clip) {
  const resultado = await intentar(() => api.clipPegar(clip.id));
  avisarSiSoloCopiado(resultado);
}

export async function pegarDeBoveda(entrada) {
  const resultado = await intentar(() => api.bovedaPegar(entrada.id));
  avisarSiSoloCopiado(resultado);
}

export async function fijarClip(clip) {
  await intentar(() => api.clipFijar(clip.id, !clip.fijado));
  await ui.recargar({ mantener: true });
}

export async function borrarClip(clip) {
  await intentar(() => api.clipBorrar(clip.id));
  await ui.recargar({ mantener: true });
}

// Texto del último clip de texto (para {portapapeles}).
export async function ultimoTexto() {
  const clips = await intentar(() => api.historialListar('', 30));
  const clip = (clips ?? []).find(item => item.tipo === 'texto' && item.texto);
  return clip?.texto ?? '';
}

export async function cargarFragmentos() {
  const lista = await intentar(() => api.fragmentosListar());
  estado.fragmentos = Array.isArray(lista) ? lista : [];
}

export async function cargarAcciones() {
  const lista = await intentar(() => api.accionesListar());
  estado.acciones = Array.isArray(lista) ? lista : [];
}

export function abrirAjustes() {
  intentar(() => api.ajustesAbrir());
}
