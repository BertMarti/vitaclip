// Ajustes → Atajos: tres grabadores (Abrir Vitaclip, Capturar zona y Grabar vídeo) con Restablecer y Desactivar,
// el aviso de bienvenida (#bienvenida) y las órdenes para crear atajos del sistema (Wayland).
// Los duplicados se detectan antes de guardar; los errores de Rust se enseñan tal cual bajo el grabador.

import { el, poner } from './dom.js';
import { t, idiomaActual } from './i18n.js';
import { icono } from './iconos.js';
import { esMac, boton, legible } from './comun.js';
import { ATAJOS_DEFECTO, ACCIONES_ATAJO, atajoDeEvento, partesLegibles, quienUsa, normalizarAtajo } from './atajos.js';
import { datos, pagina, guardar, cabeceraSeccion, filaAjuste, grupoAjustes, lineaCodigo } from './ajustes-comun.js';

const ORDENES = { popup: 'vitaclip --mostrar', captura: 'vitaclip --captura', video: 'vitaclip --video' };

let bienvenida = false;
// Último error de cada acción, para enseñarlo bajo su grabador tras repintar.
const errores = {};

export function activarBienvenida() {
  bienvenida = true;
}

function teclasDe(atajo) {
  const partes = partesLegibles(atajo, { mac: esMac, idioma: idiomaActual() });
  if (!partes.length) {
    return el('span', { class: 'suave', text: t('atajos.desactivado') });
  }
  return partes.map(parte => el('kbd', { text: parte }));
}

async function cambiar(accion, atajo) {
  const otra = quienUsa(datos.ajustes.atajos, atajo, accion);
  if (otra) {
    errores[accion] = t('atajos.repetido', { accion: t(`atajos.${otra}`) });
    pagina.pintar();
    return;
  }
  errores[accion] = '';
  const resultado = await guardar({ atajos: { ...datos.ajustes.atajos, [accion]: atajo } });
  if (resultado === true) {
    bienvenida = false;
  } else {
    errores[accion] = resultado;
  }
  pagina.pintar();
}

async function alGrabar(evento, accion, caja, error, parar) {
  if (!caja.classList.contains('grabando')) {
    return;
  }
  evento.preventDefault();
  evento.stopPropagation();
  if (evento.key === 'Escape' && !evento.ctrlKey && !evento.altKey && !evento.shiftKey && !evento.metaKey) {
    parar();
    return;
  }
  const resultado = atajoDeEvento(evento);
  if (resultado.pendiente) {
    return;
  }
  if (resultado.error) {
    error.textContent = t(`atajo.${resultado.error}`);
    return;
  }
  caja.classList.remove('grabando');
  await cambiar(accion, resultado.atajo);
}

function grabador(accion) {
  const error = el('p', { class: 'error-texto', attrs: { role: 'alert' }, text: errores[accion] ?? '' });
  const caja = el('button', {
    type: 'button',
    class: 'grabador',
    attrs: { 'aria-label': t('atajos.grabar', { accion: t(`atajos.${accion}`) }) },
  }, teclasDe(datos.ajustes.atajos[accion]));
  const parar = () => {
    caja.classList.remove('grabando');
    poner(caja, teclasDe(datos.ajustes.atajos[accion]));
  };
  caja.addEventListener('click', () => {
    caja.classList.add('grabando');
    poner(error);
    poner(caja, el('span', { class: 'suave', text: t('atajos.pulsa') }));
  });
  caja.addEventListener('blur', parar);
  caja.addEventListener('keydown', evento => alGrabar(evento, accion, caja, error, parar));
  return el('div', { class: 'grabador-zona' }, caja, error);
}

function filaAtajo(accion) {
  const actual = datos.ajustes.atajos[accion] ?? '';
  const restablecer = boton(t('atajos.restablecer'), () => cambiar(accion, ATAJOS_DEFECTO[accion]), {
    clase: 'boton-pequeno',
    titulo: legible(ATAJOS_DEFECTO[accion]),
  });
  restablecer.disabled = normalizarAtajo(actual) === normalizarAtajo(ATAJOS_DEFECTO[accion]);
  const desactivar = boton(t('atajos.desactivar'), () => cambiar(accion, ''), { clase: 'boton-pequeno' });
  desactivar.disabled = !actual;
  return filaAjuste(`atajos.${accion}`, `atajos.${accion}Descripcion`, el('div', { class: 'atajo-controles' },
    grabador(accion),
    el('div', { class: 'atajo-botones' }, restablecer, desactivar),
  ));
}

function avisoBienvenida() {
  const sugerencias = Object.fromEntries(ACCIONES_ATAJO.map(accion => [accion, legible(ATAJOS_DEFECTO[accion])]));
  return el('div', { class: 'bienvenida' },
    el('div', { class: 'bienvenida-icono' }, icono('teclado')),
    el('div', {},
      el('strong', { text: t('atajos.bienvenidaTitulo') }),
      el('p', { text: t('atajos.bienvenidaTexto', sugerencias) }),
    ),
  );
}

function ordenesSistema() {
  return el('div', { class: 'tarjeta-info' },
    el('h3', { text: t('atajos.sistemaTitulo') }),
    el('p', { class: 'suave', text: t('atajos.sistemaTexto') }),
    ACCIONES_ATAJO.map(accion => el('div', { class: 'orden-sistema' },
      el('span', { class: 'orden-sistema-nombre', text: t(`atajos.${accion}`) }),
      lineaCodigo(ORDENES[accion]),
    )),
  );
}

export function seccionAtajos() {
  return [
    cabeceraSeccion('ajustes.atajos', 'atajos.descripcion'),
    bienvenida && avisoBienvenida(),
    grupoAjustes(...ACCIONES_ATAJO.map(filaAtajo)),
    el('p', { class: 'suave nota', text: t('atajos.nota') }),
    ordenesSistema(),
  ];
}
