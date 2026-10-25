// Ajustes → Capturas y vídeo: carpetas de capturas y de vídeos, fotogramas por segundo y calidad.
// carpeta_elegir abre el diálogo del sistema y, si se elige una, Rust ya la guarda en los ajustes.

import * as api from './api.js';
import { el } from './dom.js';
import { t } from './i18n.js';
import { boton, intentar } from './comun.js';
import {
  datos, pagina, guardar, cabeceraSeccion, filaAjuste, grupoAjustes, segmentado, selector,
} from './ajustes-comun.js';

// tipo del contrato ("capturas" | "videos") → campo de Ajustes donde vive su carpeta.
const CAMPO = { capturas: 'capturas', videos: 'video' };

function carpetaDe(tipo) {
  return datos.ajustes[CAMPO[tipo]]?.carpeta ?? '';
}

async function elegir(tipo) {
  const ruta = await intentar(() => api.carpetaElegir(tipo));
  if (typeof ruta === 'string' && ruta) {
    const campo = CAMPO[tipo];
    datos.ajustes = { ...datos.ajustes, [campo]: { ...datos.ajustes[campo], carpeta: ruta } };
    pagina.pintar();
  }
}

async function porDefecto(tipo) {
  const campo = CAMPO[tipo];
  await guardar({ [campo]: { ...datos.ajustes[campo], carpeta: '' } });
  pagina.pintar();
}

function filaCarpeta(tipo) {
  const ruta = carpetaDe(tipo);
  const texto = ruta || t(`capturasAjustes.${tipo}Defecto`);
  return filaAjuste(`capturasAjustes.${tipo}`, null, el('div', { class: 'carpeta-controles' },
    boton(t('capturasAjustes.elegir'), () => elegir(tipo), { clase: 'boton-pequeno', icono: 'carpeta' }),
    boton(t('capturasAjustes.abrir'), () => intentar(() => api.carpetaAbrir(tipo)), { clase: 'boton-pequeno' }),
    ruta && boton(t('capturasAjustes.porDefecto'), () => porDefecto(tipo), { clase: 'boton-pequeno' }),
  ), el('code', { class: ['ruta-carpeta', !ruta && 'suave'], text: texto, attrs: { title: texto } }));
}

function guardarVideo(cambios) {
  return guardar({ video: { ...datos.ajustes.video, ...cambios } });
}

function controlFps() {
  const cambiar = async fps => {
    await guardarVideo({ fps });
    pagina.pintar();
  };
  return segmentado(Number(datos.ajustes.video.fps), [[30, 'capturasAjustes.fps30'], [60, 'capturasAjustes.fps60']], cambiar, t('capturasAjustes.fps'));
}

function controlCalidad() {
  const opciones = [['alta', 'capturasAjustes.alta'], ['maxima', 'capturasAjustes.maxima']];
  return selector(datos.ajustes.video.calidad, opciones, calidad => guardarVideo({ calidad }), t('capturasAjustes.calidad'));
}

export function seccionCapturas() {
  return [
    cabeceraSeccion('ajustes.capturas', 'capturasAjustes.descripcion'),
    grupoAjustes(filaCarpeta('capturas')),
    grupoAjustes(
      filaCarpeta('videos'),
      filaAjuste('capturasAjustes.fps', 'capturasAjustes.fpsDescripcion', controlFps()),
      filaAjuste('capturasAjustes.calidad', 'capturasAjustes.calidadDescripcion', controlCalidad()),
    ),
    el('p', { class: 'nota-aviso nota-video', text: t('capturasAjustes.nota') }),
  ];
}
