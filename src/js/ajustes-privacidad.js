// Ajustes → Privacidad: patrones a ignorar, vaciar, exportar e importar el historial.

import * as api from './api.js';
import { el, poner } from './dom.js';
import { t } from './i18n.js';
import { aviso, botonConfirmar, mensajeError, mostrarError } from './comun.js';
import { datos, guardar, cabeceraSeccion, filaAjuste, interruptor, grupoAjustes, lineaCodigo } from './ajustes-comun.js';

const EJEMPLOS = ['^ES\\d{22}$', '(?i)contraseña'];

let incluirFijados = false;

function patrones() {
  const area = el('textarea', {
    class: 'campo campo-mono',
    rows: 6,
    spellcheck: false,
    value: (datos.ajustes.ignorar ?? []).join('\n'),
    attrs: { 'aria-label': t('privacidad.patrones') },
  });
  area.addEventListener('change', () => {
    const lista = area.value.split('\n').map(linea => linea.trim()).filter(Boolean);
    guardar({ ignorar: lista });
  });
  return el('div', { class: 'bloque' },
    el('h3', { text: t('privacidad.patrones') }),
    el('p', { class: 'suave', text: t('privacidad.patronesDescripcion') }),
    area,
    el('p', { class: 'suave', text: t('privacidad.ejemplos') }),
    EJEMPLOS.map(lineaCodigo),
  );
}

function vaciar() {
  const accion = async () => {
    try {
      await api.historialVaciar(incluirFijados);
      aviso(t('privacidad.vaciado'), 'ok');
    } catch (error) {
      mostrarError(error);
    }
  };
  return grupoAjustes(
    filaAjuste('privacidad.incluirFijados', 'privacidad.incluirFijadosDescripcion',
      interruptor(incluirFijados, valor => { incluirFijados = valor; }, t('privacidad.incluirFijados'))),
    filaAjuste('privacidad.vaciar', 'privacidad.vaciarDescripcion', botonConfirmar(t('privacidad.vaciar'), accion)),
  );
}

function exportar() {
  const resultado = el('div', { class: 'resultado-accion' });
  const boton = el('button', {
    type: 'button',
    class: 'boton',
    text: t('privacidad.exportar'),
    on: {
      click: async () => {
        try {
          const ruta = await api.historialExportar();
          poner(resultado, el('span', { class: 'suave', text: t('privacidad.exportadoEn') }), lineaCodigo(String(ruta)));
          aviso(t('privacidad.exportado'), 'ok');
        } catch (error) {
          mostrarError(error);
        }
      },
    },
  });
  return filaAjuste('privacidad.exportar', 'privacidad.exportarDescripcion', boton, resultado);
}

function leerArchivo(archivo) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.addEventListener('load', () => resolver(String(lector.result)));
    lector.addEventListener('error', () => rechazar(new Error('lectura_archivo')));
    lector.readAsText(archivo);
  });
}

function importar() {
  const resultado = el('p', { class: 'suave' });
  const entrada = el('input', {
    type: 'file',
    class: 'oculto-accesible',
    accept: '.json,application/json',
    attrs: { id: 'importar-archivo' },
  });
  entrada.addEventListener('change', async () => {
    const archivo = entrada.files?.[0];
    if (!archivo) {
      return;
    }
    try {
      const json = await leerArchivo(archivo);
      const cantidad = await api.historialImportar(json);
      resultado.textContent = t('privacidad.importados', { n: cantidad, archivo: archivo.name });
      aviso(t('privacidad.importados', { n: cantidad, archivo: archivo.name }), 'ok');
    } catch (error) {
      resultado.textContent = mensajeError(error);
      mostrarError(error);
    }
    entrada.value = '';
  });
  const etiqueta = el('label', { class: 'boton', attrs: { for: 'importar-archivo' }, text: t('privacidad.elegirArchivo') });
  return filaAjuste('privacidad.importar', 'privacidad.importarDescripcion', el('div', {}, entrada, etiqueta), resultado);
}

export function seccionPrivacidad() {
  return [
    cabeceraSeccion('ajustes.privacidad', 'privacidad.descripcion'),
    patrones(),
    el('h3', { class: 'subtitulo-seccion', text: t('privacidad.historial') }),
    vaciar(),
    grupoAjustes(exportar(), importar()),
  ];
}
