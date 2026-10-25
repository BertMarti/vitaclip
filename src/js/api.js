// Única puerta entre la interfaz y Rust. Una función por comando del contrato
// (docs/specs/2026-10-25-vitaclip-v02-diseno.md, sección 3, y lo que sigue valiendo de la 0.1).
// Argumentos en camelCase. Fuera de Tauri (abriendo el HTML en un navegador) se usa el simulador en memoria.

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

// Fragmentos
export const fragmentosListar = () => invoke('fragmentos_listar');
export const fragmentoGuardar = fragmento => invoke('fragmento_guardar', { fragmento });
export const fragmentoBorrar = id => invoke('fragmento_borrar', { id });

// Ajustes
export const ajustesLeer = () => invoke('ajustes_leer');
export const ajustesGuardar = ajustes => invoke('ajustes_guardar', { ajustes });

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

// Capturas de pantalla. modo: "imagen" | "video". png: base64 sin el prefijo data:.
export const capturaIniciar = modo => invoke('captura_iniciar', { modo });
export const capturaInfo = () => invoke('captura_info');
export const capturaImagen = () => invoke('captura_imagen');
export const capturaCopiar = png => invoke('captura_copiar', { png });
export const capturaGuardar = png => invoke('captura_guardar', { png });
export const capturaCancelar = () => invoke('captura_cancelar');

// Vídeo. region: {x, y, ancho, alto} en píxeles físicos del monitor congelado, o null = pantalla completa.
export const videoIniciar = (region = null) => invoke('video_iniciar', { region });
export const videoParar = () => invoke('video_parar');
export const videoEstado = () => invoke('video_estado');

// Archivos de capturas y vídeos. tipo: "capturas" | "videos".
export const capturasRecientes = (limite = 30) => invoke('capturas_recientes', { limite });
export const carpetaAbrir = tipo => invoke('carpeta_abrir', { tipo });
export const carpetaElegir = tipo => invoke('carpeta_elegir', { tipo });
export const archivoMostrar = ruta => invoke('archivo_mostrar', { ruta });
export const archivoCopiarImagen = ruta => invoke('archivo_copiar_imagen', { ruta });

// Ventanas
export const ventanaOcultar = () => invoke('ventana_ocultar');
// bienvenida = true abre los ajustes en la sección Atajos con el aviso de bienvenida.
export const ajustesAbrir = (bienvenida = false) => invoke('ajustes_abrir', { bienvenida: Boolean(bienvenida) });
export const pausaCambiar = pausado => invoke('pausa_cambiar', { pausado });

// Mover y redimensionar la ventana sin bordes (API de ventanas de Tauri; en el navegador no hace nada).
function ventanaActual() {
  return tauri?.window?.getCurrentWindow?.() ?? null;
}

export const arrastrarVentana = () => ventanaActual()?.startDragging() ?? Promise.resolve();
export const redimensionarVentana = () => ventanaActual()?.startResizeDragging('SouthEast') ?? Promise.resolve();

// Eventos de Rust: historial-cambiado, popup-mostrado, captura-lista, video-estado, video-guardado, video-error.
export const alEvento = (nombre, funcion) => listen(nombre, funcion);
