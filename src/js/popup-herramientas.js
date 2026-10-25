// Pestaña Herramientas: calculadora, generadores (pegan con Enter) y acciones personalizadas (Pro).

import { el } from './dom.js';
import { t, idiomaActual } from './i18n.js';
import { icono } from './iconos.js';
import { boton, tarjetaPro } from './comun.js';
import { coincide, vistaPrevia } from './herramientas/buscar.js';
import { esCalculo, calcular, formatear } from './herramientas/calcular.js';
import { uuid, contrasena, fechaIso, marcaUnix, lorem } from './herramientas/generar.js';
import { estado, ui, pegarTexto, abrirAjustes } from './popup-estado.js';
import { editorAccion, ejecutarAccionSobreClip, olvidarBorrador, resumenPasos, enfocarNombre } from './popup-acciones.js';

const opciones = { longitud: 20, simbolos: true, palabras: 40 };

const GENERADORES = [
  { id: 'uuid', clave: 'gen.uuid', icono: 'hash', crear: () => uuid() },
  { id: 'contrasena', clave: 'gen.contrasena', icono: 'llave', crear: () => contrasena(opciones.longitud, { simbolos: opciones.simbolos }) },
  { id: 'fecha', clave: 'gen.fechaIso', icono: 'reloj', crear: () => fechaIso() },
  { id: 'unix', clave: 'gen.unix', icono: 'reloj', crear: () => String(marcaUnix()) },
  { id: 'lorem', clave: 'gen.lorem', icono: 'texto', crear: () => lorem(opciones.palabras) },
];

// Valor actual de cada generador: se ve antes de pegarlo.
const valores = new Map();
let expresion = '';

function valorDe(generador) {
  if (!valores.has(generador.id)) {
    valores.set(generador.id, generador.crear());
  }
  return valores.get(generador.id);
}

function regenerar(generador) {
  valores.set(generador.id, generador.crear());
}

// --- Elementos de la lista

function elementosAcciones() {
  if (!estado.pro) {
    return [{ tipo: 'accionesPro', id: 'acciones-pro' }];
  }
  const acciones = estado.acciones.map(accion => ({ tipo: 'accion', id: `a${accion.id}`, accion }));
  return [...acciones, { tipo: 'accionNueva', id: 'a0', accion: { id: 0, nombre: '', pasos: [] } }];
}

function nombreDe(elemento) {
  switch (elemento.tipo) {
    case 'calculadora': return t('herramientas.calculadora');
    case 'generador': return t(elemento.generador.clave);
    case 'accion': return elemento.accion.nombre;
    case 'accionNueva': return t('acciones.nueva');
    default: return t('detalle.acciones');
  }
}

async function cargar(consulta) {
  if (esCalculo(consulta)) {
    expresion = consulta.trim();
  }
  const todos = [
    { tipo: 'calculadora', id: 'calculadora' },
    ...GENERADORES.map(generador => ({ tipo: 'generador', id: generador.id, generador })),
    ...elementosAcciones(),
  ];
  if (!consulta.trim() || esCalculo(consulta)) {
    return todos;
  }
  return todos.filter(elemento => coincide(nombreDe(elemento), consulta));
}

// --- Filas

function resultadoCalculo(texto) {
  try {
    return { valor: formatear(calcular(texto), idiomaActual()) };
  } catch (error) {
    return { error: error.message };
  }
}

function lateral(elemento) {
  switch (elemento.tipo) {
    case 'calculadora': {
      const { valor } = expresion ? resultadoCalculo(expresion) : {};
      return valor ? `= ${valor}` : '=2+2';
    }
    case 'generador': return vistaPrevia(valorDe(elemento.generador), 28);
    case 'accion': return resumenPasos(elemento.accion);
    default: return '';
  }
}

const ICONOS = { calculadora: 'calculadora', accion: 'rayo', accionNueva: 'mas', accionesPro: 'candado' };

function fila(elemento, indice) {
  const nombreIcono = elemento.tipo === 'generador' ? elemento.generador.icono : ICONOS[elemento.tipo];
  return el('div', { class: ['fila-clip', elemento.tipo === 'accionesPro' && 'fila-bloqueada'] },
    el('span', { class: 'fila-numero', text: indice < 9 ? String(indice + 1) : '' }),
    el('span', { class: 'icono-tipo' }, icono(nombreIcono)),
    el('span', { class: 'fila-texto', text: nombreDe(elemento) }),
    elemento.tipo === 'accionesPro'
      ? el('span', { class: 'chip chip-pro', text: t('comun.pro') })
      : el('span', { class: 'fila-tiempo fila-mono', text: lateral(elemento) }),
  );
}

function grupo(elemento) {
  return ['calculadora', 'generador'].includes(elemento.tipo) ? t('grupo.utilidades') : t('grupo.acciones');
}

// --- Detalles

function detalleCalculadora() {
  const resultado = el('p', { class: 'resultado-grande' });
  const entrada = el('input', {
    type: 'text',
    class: 'campo campo-mono',
    value: expresion.replace(/^=/, ''),
    placeholder: '21*1,21',
    attrs: { 'aria-label': t('herramientas.expresion') },
  });
  const actualizar = () => {
    expresion = entrada.value;
    const { valor, error } = entrada.value.trim() ? resultadoCalculo(entrada.value) : {};
    resultado.textContent = valor ?? (error ? t(`error.${error}`) : '—');
    resultado.classList.toggle('error-texto', Boolean(error));
  };
  entrada.addEventListener('input', actualizar);
  const formulario = el('form', { class: 'editor' },
    el('h3', {}, icono('calculadora'), t('herramientas.calculadora')),
    entrada,
    resultado,
    el('div', { class: 'botonera' },
      el('button', { type: 'submit', class: 'boton boton-primario navegable', text: t('detalle.pegar') }),
    ),
    el('p', { class: 'suave', text: t('calculo.ayuda') }),
  );
  formulario.addEventListener('submit', evento => {
    evento.preventDefault();
    pegarCalculo();
  });
  actualizar();
  return formulario;
}

function pegarCalculo() {
  const { valor } = expresion.trim() ? resultadoCalculo(expresion) : {};
  if (valor) {
    pegarTexto(valor);
  }
}

function opcionNumero(clave, minimo, maximo, etiqueta) {
  return el('label', { class: 'etiqueta etiqueta-linea' },
    el('span', { text: t(etiqueta) }),
    el('input', {
      type: 'number',
      class: 'campo campo-numero',
      min: minimo,
      max: maximo,
      value: opciones[clave],
      on: {
        change: evento => {
          const numero = Math.round(Number(evento.target.value));
          opciones[clave] = Math.max(minimo, Math.min(maximo, numero || opciones[clave]));
          valores.clear();
          ui.repintar();
        },
      },
    }),
  );
}

function opcionSimbolos() {
  return el('label', { class: 'interruptor' },
    el('input', {
      type: 'checkbox',
      checked: opciones.simbolos,
      on: {
        change: evento => {
          opciones.simbolos = evento.target.checked;
          valores.delete('contrasena');
          ui.repintar();
        },
      },
    }),
    el('span', { text: t('gen.simbolos') }),
  );
}

function opcionesDe(generador) {
  if (generador.id === 'contrasena') {
    return el('div', { class: 'opciones' }, opcionNumero('longitud', 8, 128, 'gen.longitud'), opcionSimbolos());
  }
  if (generador.id === 'lorem') {
    return el('div', { class: 'opciones' }, opcionNumero('palabras', 1, 500, 'gen.palabras'));
  }
  return null;
}

function detalleGenerador(generador) {
  const valor = el('pre', { class: 'contenido-clip valor-generado', text: valorDe(generador) });
  return el('div', { class: 'editor' },
    el('h3', {}, icono(generador.icono), t(generador.clave)),
    valor,
    opcionesDe(generador),
    el('div', { class: 'botonera' },
      boton(t('detalle.pegar'), () => pegarGenerado(generador), { clase: 'boton-primario navegable', titulo: '↵' }),
      boton(t('gen.otro'), () => {
        regenerar(generador);
        ui.repintar();
      }, { icono: 'dado', clase: 'navegable' }),
    ),
  );
}

function pegarGenerado(generador) {
  const valor = valorDe(generador);
  regenerar(generador);
  pegarTexto(valor);
}

function detalle(elemento) {
  if (!elemento) return null;
  switch (elemento.tipo) {
    case 'calculadora': return detalleCalculadora();
    case 'generador': return detalleGenerador(elemento.generador);
    case 'accion':
    case 'accionNueva': return editorAccion(elemento.accion);
    default: return tarjetaPro('acciones.titulo', ['acciones.pro1', 'acciones.pro2', 'acciones.pro3'], abrirAjustes);
  }
}

function activar(elemento) {
  switch (elemento.tipo) {
    case 'calculadora': pegarCalculo(); break;
    case 'generador': pegarGenerado(elemento.generador); break;
    case 'accion': ejecutarAccionSobreClip(elemento.accion); break;
    case 'accionNueva': enfocarNombre(document.querySelector('.detalle')); break;
    default: abrirAjustes();
  }
}

export const vistaHerramientas = {
  cargar,
  clave: elemento => elemento.id,
  fila,
  detalle,
  activar,
  grupo,
  alSeleccionar: olvidarBorrador,
};
