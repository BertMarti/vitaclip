// Parte del simulador para capturas y vídeo: pantalla congelada falsa (dibujada en un canvas),
// grabación simulada con eventos video-estado cada segundo y archivos recientes de ejemplo.
// Solo se usa fuera de Tauri (ver simulador.js).

const MINUTO = 60000;
const ahora = Date.now();
const CARPETAS = { capturas: '/home/ana/Imágenes/Vitaclip', videos: '/home/ana/Vídeos/Vitaclip' };

let recientes = [
  { ruta: `${CARPETAS.capturas}/vitaclip-2026-10-25_10-42-07.png`, nombre: 'vitaclip-2026-10-25_10-42-07.png', tipo: 'imagen', tamano: 284311, creado: ahora - 6 * MINUTO },
  { ruta: `${CARPETAS.videos}/vitaclip-2026-10-25_09-15-40.mp4`, nombre: 'vitaclip-2026-10-25_09-15-40.mp4', tipo: 'video', tamano: 18874368, creado: ahora - 95 * MINUTO },
  { ruta: `${CARPETAS.capturas}/vitaclip-2026-10-24_18-03-55.png`, nombre: 'vitaclip-2026-10-24_18-03-55.png', tipo: 'imagen', tamano: 1048576 * 1.4, creado: ahora - 17 * 60 * MINUTO },
  { ruta: `${CARPETAS.capturas}/vitaclip-2026-10-21_12-30-01.png`, nombre: 'vitaclip-2026-10-21_12-30-01.png', tipo: 'imagen', tamano: 96200, creado: ahora - 4 * 24 * 60 * MINUTO },
];

const grabacion = { grabando: false, inicio: 0, temporizador: null };
let modoCaptura = new URLSearchParams(globalThis.location?.search ?? '').get('modo') === 'video' ? 'video' : 'imagen';
let pantalla = null;

function dos(numero) {
  return String(numero).padStart(2, '0');
}

function nombreArchivo(extension) {
  const fecha = new Date();
  const dia = `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
  const hora = `${dos(fecha.getHours())}-${dos(fecha.getMinutes())}-${dos(fecha.getSeconds())}`;
  return `vitaclip-${dia}_${hora}.${extension}`;
}

function anadirReciente(tipo, tamano) {
  const nombre = nombreArchivo(tipo === 'video' ? 'mp4' : 'png');
  const carpeta = CARPETAS[tipo === 'video' ? 'videos' : 'capturas'];
  const archivo = { ruta: `${carpeta}/${nombre}`, nombre, tipo, tamano, creado: Date.now() };
  recientes = [archivo, ...recientes];
  return archivo.ruta;
}

// --- Pantalla falsa: fondo, una ventana con texto y una barra de tareas

function ventanaFalsa(ctx, ancho, alto, d) {
  const x = ancho * 0.16;
  const y = alto * 0.14;
  const w = ancho * 0.5;
  const h = alto * 0.58;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#e9ede3';
  ctx.fillRect(x, y, w, 34 * d);
  ['#ef4444', '#f59e0b', '#22c55e'].forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + (18 + i * 18) * d, y + 17 * d, 5 * d, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#1b2116';
  ctx.font = `600 ${22 * d}px system-ui, sans-serif`;
  ctx.fillText('Informe trimestral', x + 28 * d, y + 80 * d);
  ctx.font = `${14 * d}px system-ui, sans-serif`;
  const lineas = ['Ventas: +12 % respecto al trimestre anterior.', 'Clientes nuevos: 48 (objetivo 40).', 'Pendiente: revisar el presupuesto de marketing.'];
  lineas.forEach((linea, i) => ctx.fillText(linea, x + 28 * d, y + (120 + i * 28) * d));
  [0.62, 0.8, 0.45, 0.7, 0.9].forEach((valor, i) => {
    ctx.fillStyle = i === 4 ? '#84cc16' : '#cdd4c3';
    const barra = h * 0.35 * valor;
    ctx.fillRect(x + 28 * d + i * 46 * d, y + h - 30 * d - barra, 30 * d, barra);
  });
}

function dibujarPantalla(ancho, alto, d) {
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext('2d');
  const fondo = ctx.createLinearGradient(0, 0, ancho, alto);
  fondo.addColorStop(0, '#1e3a5f');
  fondo.addColorStop(0.55, '#3f6212');
  fondo.addColorStop(1, '#a3e635');
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, ancho, alto);
  ventanaFalsa(ctx, ancho, alto, d);
  ctx.fillStyle = 'rgba(15, 18, 13, 0.85)';
  ctx.fillRect(0, alto - 40 * d, ancho, 40 * d);
  ctx.fillStyle = '#e8ede3';
  ctx.font = `${13 * d}px system-ui, sans-serif`;
  ctx.fillText('10:42', ancho - 60 * d, alto - 15 * d);
  return lienzo.toDataURL('image/png');
}

function congelar() {
  const d = globalThis.devicePixelRatio || 1;
  const ancho = Math.round((globalThis.innerWidth || 1280) * d);
  const alto = Math.round((globalThis.innerHeight || 800) * d);
  pantalla = { info: { modo: modoCaptura, ancho, alto, escala: d }, url: dibujarPantalla(ancho, alto, d) };
  return pantalla;
}

// --- Grabación simulada

function estadoVideo() {
  return { grabando: grabacion.grabando, segundos: grabacion.grabando ? (Date.now() - grabacion.inicio) / 1000 : 0 };
}

function empezarGrabacion(emitir) {
  if (grabacion.grabando) {
    return;
  }
  Object.assign(grabacion, { grabando: true, inicio: Date.now() });
  emitir('video-estado', estadoVideo());
  grabacion.temporizador = setInterval(() => emitir('video-estado', estadoVideo()), 1000);
}

function pararGrabacion(emitir) {
  if (!grabacion.grabando) {
    throw 'No se está grabando nada';
  }
  const segundos = estadoVideo().segundos;
  clearInterval(grabacion.temporizador);
  Object.assign(grabacion, { grabando: false, temporizador: null });
  const ruta = anadirReciente('video', Math.round(segundos * 2.5e6));
  emitir('video-estado', estadoVideo());
  emitir('video-guardado', { ruta });
  return ruta;
}

// Simula que Rust cierra el editor y lo vuelve a abrir con una captura nueva.
function reabrirEditor(emitir, ms = 900) {
  setTimeout(() => emitir('captura-lista', congelar().info), ms);
}

function exigirRuta(ruta, tipo = null) {
  const archivo = recientes.find(item => item.ruta === ruta);
  if (!archivo || (tipo && archivo.tipo !== tipo)) {
    throw 'Ese archivo no está en las carpetas de Vitaclip';
  }
}

export function comandosCapturas(emitir, ajustesActuales, guardarAjustes) {
  if (globalThis.location?.pathname.endsWith('grabacion.html')) {
    empezarGrabacion(emitir);
  }
  return {
    captura_iniciar: ({ modo }) => {
      modoCaptura = modo === 'video' ? 'video' : 'imagen';
      globalThis.window?.open(`captura.html?modo=${modoCaptura}`, '_blank');
      if (modoCaptura === 'video') {
        setTimeout(() => empezarGrabacion(emitir), 1500);
      }
    },
    captura_info: () => (pantalla ?? congelar()).info,
    captura_imagen: () => (pantalla ?? congelar()).url,
    captura_copiar: ({ png }) => {
      console.info('[simulador] captura_copiar', `${Math.round(png.length * 0.75 / 1024)} KB`);
      reabrirEditor(emitir);
    },
    captura_guardar: ({ png }) => {
      const ruta = anadirReciente('imagen', Math.round(png.length * 0.75));
      reabrirEditor(emitir, 1600);
      return ruta;
    },
    captura_cancelar: () => {
      console.info('[simulador] captura_cancelar');
      reabrirEditor(emitir, 600);
    },
    video_iniciar: ({ region }) => {
      console.info('[simulador] video_iniciar', region ?? 'pantalla completa');
      empezarGrabacion(emitir);
      reabrirEditor(emitir);
    },
    video_parar: () => pararGrabacion(emitir),
    video_estado: () => estadoVideo(),
    capturas_recientes: ({ limite }) => recientes.slice(0, limite || 30),
    carpeta_abrir: ({ tipo }) => {
      console.info('[simulador] carpeta_abrir', tipo);
    },
    carpeta_elegir: ({ tipo }) => {
      const ruta = tipo === 'videos' ? '/home/ana/Escritorio/Grabaciones' : '/home/ana/Escritorio/Capturas';
      const campo = tipo === 'videos' ? 'video' : 'capturas';
      const ajustes = ajustesActuales();
      guardarAjustes({ ...ajustes, [campo]: { ...ajustes[campo], carpeta: ruta } });
      return ruta;
    },
    archivo_mostrar: ({ ruta }) => {
      exigirRuta(ruta);
      console.info('[simulador] archivo_mostrar', ruta);
    },
    archivo_copiar_imagen: ({ ruta }) => {
      exigirRuta(ruta, 'imagen');
    },
  };
}
