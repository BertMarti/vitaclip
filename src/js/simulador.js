// Simulador en memoria del backend de Rust, para diseñar la interfaz en un navegador.
// Solo se usa si no existe window.__TAURI__. Desde la consola:
//   vitaclipSimulador.emitir('popup-mostrado')
//   vitaclipSimulador.reiniciar()            vuelve a los ajustes iniciales
// Las capturas y el vídeo están en simulador-capturas.js.
// Los errores imitan a los de Rust: cadenas en español listas para enseñar.

import { comandosCapturas } from './simulador-capturas.js';

const MINUTO = 60000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;
const ahora = Date.now();

const IMAGEN_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">',
  '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">',
  '<stop offset="0" stop-color="#a3e635"/><stop offset="1" stop-color="#0ea5e9"/>',
  '</linearGradient></defs>',
  '<rect width="320" height="200" fill="url(#g)"/>',
  '<circle cx="250" cy="60" r="28" fill="#fff" fill-opacity=".7"/>',
  '<path d="M0 200 L110 90 L190 170 L240 130 L320 200 Z" fill="#1c2417" fill-opacity=".55"/>',
  '</svg>',
].join('');

function clip(id, texto, haceMs, extra = {}) {
  return { id, tipo: 'texto', texto, creado: ahora - haceMs, usado: ahora - haceMs, usos: 0, fijado: false, ...extra };
}

let clips = [
  clip(1, 'ana@example.com', 2 * MINUTO, { fijado: true, usos: 12 }),
  clip(2, 'https://github.com/BertMarti/vitaclip', 9 * MINUTO),
  clip(3, '#1e90ff', 25 * MINUTO),
  clip(4, '{"proyecto":"Vitaclip","version":"0.2.0","etiquetas":["portapapeles","tauri"]}', 50 * MINUTO),
  clip(5, '', 2 * HORA, { tipo: 'imagen', ancho: 320, alto: 200 }),
  clip(6, 'Hola Marta:\n\nTe envío el presupuesto revisado. Si te parece bien, lo firmamos el lunes.\n\nUn saludo,\nAna', 3 * HORA),
  clip(7, 'hsl(84, 81%, 44%)', 5 * HORA),
  clip(8, 'const total = items.reduce((suma, item) => suma + item.precio, 0);', 20 * HORA),
  clip(9, 'Calle Mayor 12, 3.º B · 28013 Madrid', DIA + 2 * HORA, { fijado: true }),
  clip(10, 'aGVsbG8gdml0YWNsaXA=', 2 * DIA),
  clip(11, 'lista de la compra\nleche\npan\nleche\nhuevos\naceite', 3 * DIA),
  clip(12, 'rgb(244, 63, 94)', 4 * DIA),
  clip(13, 'Reunión de equipo — jueves 10:00, sala Ágora', 6 * DIA),
  clip(14, 'https://www.example.com/informe?mes=octubre&formato=pdf', 9 * DIA),
  clip(15, '612345678', 12 * DIA),
];

let fragmentos = [
  { id: 1, nombre: 'Firma', abreviatura: 'firma', contenido: 'Un saludo,\nAna García\nana@example.com{cursor}' },
  { id: 2, nombre: 'Informe semanal', abreviatura: 'inf', contenido: 'Hola, te envío el informe del {fecha}. Un saludo.' },
  { id: 3, nombre: 'Respuesta a pedido', abreviatura: 'ped', contenido: 'Hola {campo:Nombre}, te escribo de {campo:Empresa|Acme} por el pedido {campo:Pedido}.' },
];

const boveda = { existe: false, abierta: false, contrasena: '', entradas: [] };
const oyentes = new Map();
let siguienteId = 100;

const AJUSTES_INICIALES = {
  atajos: { popup: 'CommandOrControl+Alt+KeyV', captura: 'CommandOrControl+Alt+KeyC', video: 'CommandOrControl+Alt+KeyR' },
  ventana: { modo: 'raton', x: null, y: null, ancho: 380, alto: 480 },
  capturas: { carpeta: '' },
  video: { carpeta: '', fps: 30, calidad: 'alta' },
  tema: 'sistema',
  idioma: 'es',
  pegarAuto: true,
  arrancarConSistema: false,
  pausado: false,
  limiteHistorial: 500,
  ignorar: ['^\\d{13,19}$', '^(ghp_|sk-|AKIA|xox[abp]-)'],
  ia: { proveedor: 'ollama', url: 'http://localhost:11434/v1', modelo: 'llama3.2', clave: '' },
};

const NOMBRES_ATAJO = { popup: 'Abrir Vitaclip', captura: 'Captura', video: 'Vídeo' };

// --- Persistencia ligera (solo para que las ventanas compartan ajustes en el navegador)

function leerGuardado(clave, defecto) {
  try {
    const valor = globalThis.localStorage?.getItem(`vitaclip-sim-${clave}`);
    return valor ? JSON.parse(valor) : defecto;
  } catch {
    return defecto;
  }
}

function guardar(clave, valor) {
  try {
    globalThis.localStorage?.setItem(`vitaclip-sim-${clave}`, JSON.stringify(valor));
  } catch {
    // Sin almacenamiento: el simulador sigue funcionando en memoria.
  }
}

let ajustes = { ...AJUSTES_INICIALES, ...leerGuardado('ajustes-v2', {}) };

function emitir(nombre, payload = null) {
  for (const funcion of oyentes.get(nombre) ?? []) {
    funcion({ event: nombre, payload });
  }
}

export const vitaclipSimulador = {
  emitir,
  reiniciar() {
    guardar('ajustes-v2', AJUSTES_INICIALES);
  },
};

if (globalThis.window) {
  globalThis.window.vitaclipSimulador = vitaclipSimulador;
}

// --- Utilidades

const esperar = ms => new Promise(resolver => setTimeout(resolver, ms));

function normalizar(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function filtrarClips(consulta = '') {
  let lista = [...clips];
  let resto = consulta;
  if (/(^|\s)img:/i.test(resto)) lista = lista.filter(c => c.tipo === 'imagen');
  if (/(^|\s)url:/i.test(resto)) lista = lista.filter(c => /^(https?:\/\/|www\.)/i.test(c.texto));
  if (/(^|\s)fij:/i.test(resto)) lista = lista.filter(c => c.fijado);
  resto = resto.replace(/(^|\s)(img|url|fij):/gi, ' ');
  const palabras = normalizar(resto).split(/\s+/).filter(Boolean);
  lista = lista.filter(c => palabras.every(p => normalizar(c.texto).includes(p)));
  return lista.sort((a, b) => Number(b.fijado) - Number(a.fijado) || b.usado - a.usado);
}

function qrFalso(texto) {
  // Un patrón determinista con pinta de QR (el de verdad lo genera Rust).
  const lado = 25;
  let semilla = [...texto].reduce((suma, c) => (suma * 31 + c.charCodeAt(0)) >>> 0, 7);
  const celdas = [];
  for (let y = 0; y < lado; y += 1) {
    for (let x = 0; x < lado; x += 1) {
      semilla = (semilla * 1103515245 + 12345) >>> 0;
      const esquina = (x < 7 && y < 7) || (x > 17 && y < 7) || (x < 7 && y > 17);
      const marco = esquina && (x % 6 === 0 || y % 6 === 0 || (x % 18 > 1 && x % 18 < 5 && y % 18 > 1 && y % 18 < 5));
      if (esquina ? marco : semilla % 3 === 0) celdas.push(`<rect x="${x + 2}" y="${y + 2}" width="1" height="1"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 29" shape-rendering="crispEdges"><rect width="29" height="29" fill="#fff"/><g fill="#000">${celdas.join('')}</g></svg>`;
}

function ocultarClave(clave) {
  return clave && clave.length > 4 ? `••••${clave.slice(-4)}` : '';
}

// Igual que Rust: atajos duplicados o no registrables → error y no se cambia nada.
function comprobarAtajos(atajos) {
  const usados = Object.values(atajos ?? {}).filter(Boolean);
  if (new Set(usados).size !== usados.length) {
    throw 'Dos acciones no pueden usar el mismo atajo.';
  }
  const ocupado = Object.entries(atajos ?? {}).find(([, atajo]) => /KeyQ$/.test(atajo));
  if (ocupado) {
    throw `El atajo de ${NOMBRES_ATAJO[ocupado[0]]} no es válido o ya lo usa otra aplicación.`;
  }
}

function abierta() {
  if (!boveda.abierta) throw 'La bóveda está bloqueada';
}

function guardarAjustes(nuevos) {
  const clave = nuevos.ia.clave.startsWith('••••') ? ajustes.ia.clave : nuevos.ia.clave;
  ajustes = { ...nuevos, ia: { ...nuevos.ia, clave } };
  guardar('ajustes-v2', ajustes);
}

// --- Comandos

const comandos = {
  historial_listar: ({ consulta, limite }) => filtrarClips(consulta).slice(0, limite || 200),
  clip_imagen: () => `data:image/svg+xml;base64,${btoa(IMAGEN_SVG)}`,
  clip_pegar: ({ id }) => {
    if (!clips.some(c => c.id === id)) throw 'Clip no encontrado';
    return false;
  },
  texto_pegar: () => true,
  clip_fijar: ({ id, fijado }) => {
    clips = clips.map(c => (c.id === id ? { ...c, fijado } : c));
    emitir('historial-cambiado');
  },
  clip_borrar: ({ id }) => {
    clips = clips.filter(c => c.id !== id);
    emitir('historial-cambiado');
  },
  historial_vaciar: ({ incluirFijados }) => {
    clips = incluirFijados ? [] : clips.filter(c => c.fijado);
    emitir('historial-cambiado');
  },
  historial_exportar: () => '/home/ana/Descargas/vitaclip-historial-2026-10-25.json',
  historial_importar: ({ json }) => {
    let datos;
    try {
      datos = JSON.parse(json);
    } catch {
      throw 'El archivo no es un JSON válido';
    }
    return Array.isArray(datos) ? datos.length : (datos.clips?.length ?? 0);
  },
  fragmentos_listar: () => [...fragmentos],
  fragmento_guardar: ({ fragmento }) => {
    if (!fragmento?.nombre?.trim()) throw 'El fragmento necesita un nombre';
    const guardado = { ...fragmento, id: fragmento.id || siguienteId++ };
    fragmentos = [...fragmentos.filter(f => f.id !== guardado.id), guardado];
    return guardado;
  },
  fragmento_borrar: ({ id }) => {
    fragmentos = fragmentos.filter(f => f.id !== id);
  },
  ajustes_leer: () => ({ ...ajustes, ia: { ...ajustes.ia, clave: ocultarClave(ajustes.ia.clave) } }),
  ajustes_guardar: ({ ajustes: nuevos }) => {
    comprobarAtajos(nuevos.atajos);
    guardarAjustes(nuevos);
    return comandos.ajustes_leer();
  },
  qr_svg: ({ texto }) => {
    if (texto.length > 1500) throw 'El texto es demasiado largo para un QR';
    return qrFalso(texto);
  },
  ia_ejecutar: async ({ accion, texto, extra }) => {
    await esperar(900);
    return `[${accion}${extra ? ` · ${extra}` : ''}] ${texto.slice(0, 200)}`;
  },
  ia_probar: async () => {
    await esperar(600);
    return ajustes.ia.modelo || 'llama3.2';
  },
  boveda_estado: () => ({ existe: boveda.existe, abierta: boveda.abierta }),
  boveda_crear: ({ contrasena }) => {
    if (contrasena.length < 8) throw 'La contraseña maestra debe tener al menos 8 caracteres';
    Object.assign(boveda, { existe: true, abierta: true, contrasena });
    return comandos.boveda_estado();
  },
  boveda_desbloquear: async ({ contrasena }) => {
    await esperar(300);
    if (contrasena !== boveda.contrasena) throw 'Contraseña incorrecta';
    boveda.abierta = true;
    return comandos.boveda_estado();
  },
  boveda_bloquear: () => {
    boveda.abierta = false;
    return comandos.boveda_estado();
  },
  boveda_listar: () => {
    abierta();
    return boveda.entradas.map(({ id, titulo, creado }) => ({ id, titulo, creado }));
  },
  boveda_guardar: ({ titulo, secreto }) => {
    abierta();
    const entrada = { id: siguienteId++, titulo, creado: Date.now(), secreto };
    boveda.entradas.unshift(entrada);
    return { id: entrada.id, titulo, creado: entrada.creado };
  },
  boveda_borrar: ({ id }) => {
    boveda.entradas = boveda.entradas.filter(e => e.id !== id);
  },
  boveda_pegar: () => {
    abierta();
    return true;
  },
  ventana_ocultar: () => {
    console.info('[simulador] ventana_ocultar');
  },
  ajustes_abrir: ({ bienvenida } = {}) => {
    globalThis.window?.open(bienvenida ? 'ajustes.html#bienvenida' : 'ajustes.html', '_blank');
  },
  pausa_cambiar: ({ pausado }) => {
    ajustes.pausado = pausado;
  },
  ...comandosCapturas(emitir, () => ajustes, guardarAjustes),
};

export async function simInvoke(comando, args = {}) {
  const funcion = comandos[comando];
  if (!funcion) {
    throw `Comando desconocido: ${comando}`;
  }
  await esperar(20);
  return funcion(args);
}

export async function simListen(nombre, funcion) {
  if (!oyentes.has(nombre)) {
    oyentes.set(nombre, new Set());
  }
  oyentes.get(nombre).add(funcion);
  return () => oyentes.get(nombre)?.delete(funcion);
}
