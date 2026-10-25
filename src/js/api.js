// Única puerta entre la interfaz y Rust. Una función por comando del contrato
// (docs/specs/2026-10-24-vitaclip-diseno.md, sección 4). Argumentos en camelCase.
// Fuera de Tauri (abriendo el HTML en un navegador) se usa el simulador en memoria.

import { simInvoke, simListen } from './simulador.js';

const tauri = globalThis.window?.__TAURI__;
const invoke = tauri ? tauri.core.invoke : simInvoke;
const listen = tauri ? tauri.event.listen : simListen;

export const enTauri = Boolean(tauri);

// Historial
export const historialListar = (consulta = '', limite = 200) => invoke('historial_listar', { consulta, limite });
export const clipImagen = id => invoke('clip_imagen', { id });
export const clipPegar = id => invoke('clip_pegar', { id });
export const textoPegar = texto => invoke('texto_pegar', { texto });
export const clipFijar = (id, fijado) => invoke('clip_fijar', { id, fijado });
export const clipBorrar = id => invoke('clip_borrar', { id });
export const historialVaciar = incluirFijados => invoke('historial_vaciar', { incluirFijados });
export const historialExportar = () => invoke('historial_exportar');
export const historialImportar = json => invoke('historial_importar', { json });

// Fragmentos y acciones
export const fragmentosListar = () => invoke('fragmentos_listar');
export const fragmentoGuardar = fragmento => invoke('fragmento_guardar', { fragmento });
export const fragmentoBorrar = id => invoke('fragmento_borrar', { id });
export const accionesListar = () => invoke('acciones_listar');
export const accionGuardar = accion => invoke('accion_guardar', { accion });
export const accionBorrar = id => invoke('accion_borrar', { id });

// Ajustes y licencia
export const ajustesLeer = () => invoke('ajustes_leer');
export const ajustesGuardar = ajustes => invoke('ajustes_guardar', { ajustes });
export const licenciaEstado = () => invoke('licencia_estado');
export const licenciaActivar = clave => invoke('licencia_activar', { clave });
export const licenciaQuitar = () => invoke('licencia_quitar');

// Utilidades
export const qrSvg = texto => invoke('qr_svg', { texto });
export const iaEjecutar = (accion, texto, extra = null) => invoke('ia_ejecutar', { accion, texto, extra });
export const iaProbar = () => invoke('ia_probar');

// Bóveda
export const bovedaEstado = () => invoke('boveda_estado');
export const bovedaCrear = contrasena => invoke('boveda_crear', { contrasena });
export const bovedaDesbloquear = contrasena => invoke('boveda_desbloquear', { contrasena });
export const bovedaBloquear = () => invoke('boveda_bloquear');
export const bovedaListar = () => invoke('boveda_listar');
export const bovedaGuardar = (titulo, secreto) => invoke('boveda_guardar', { titulo, secreto });
export const bovedaBorrar = id => invoke('boveda_borrar', { id });
export const bovedaPegar = id => invoke('boveda_pegar', { id });

// Ventanas
export const ventanaOcultar = () => invoke('ventana_ocultar');
// bienvenida = true abre los ajustes en la sección Atajo con el aviso de bienvenida.
export const ajustesAbrir = (bienvenida = false) => invoke('ajustes_abrir', { bienvenida: Boolean(bienvenida) });
export const pausaCambiar = pausado => invoke('pausa_cambiar', { pausado });

// Eventos de Rust: historial-cambiado, popup-mostrado.
export const alEvento = (nombre, funcion) => listen(nombre, funcion);
