// Pestaña Bóveda (Pro): crear, desbloquear, listar títulos, añadir, pegar, borrar y bloquear.
// Nunca se muestran secretos: Rust solo devuelve {id, titulo, creado}.

import * as api from './api.js';
import { el, poner } from './dom.js';
import { t, idiomaActual } from './i18n.js';
import { icono } from './iconos.js';
import { aviso, boton, botonConfirmar, intentar, mensajeError, tarjetaPro } from './comun.js';
import { coincide, haceCuanto } from './herramientas/buscar.js';
import { estado, ui, abrirAjustes, pegarDeBoveda } from './popup-estado.js';

const MINIMO_CONTRASENA = 8;

let estadoBoveda = { existe: false, abierta: false };
let total = 0;

async function leerEstado() {
  estadoBoveda = (await api.bovedaEstado()) ?? { existe: false, abierta: false };
}

async function cargar(consulta) {
  if (!estado.pro) {
    return [];
  }
  await leerEstado();
  if (!estadoBoveda.abierta) {
    return [];
  }
  try {
    const entradas = (await api.bovedaListar()) ?? [];
    total = entradas.length;
    return entradas.filter(entrada => coincide(entrada.titulo, consulta));
  } catch (error) {
    // Puede haberse bloqueado sola entre medias (a los 5 minutos).
    await leerEstado();
    if (estadoBoveda.abierta) {
      throw error;
    }
    return [];
  }
}

// --- Formularios de contraseña maestra

function campoContrasena(nombre, etiqueta, autocompletar) {
  return el('label', { class: 'etiqueta' },
    el('span', { text: t(etiqueta) }),
    el('input', { type: 'password', class: 'campo', name: nombre, autocomplete: autocompletar, required: true }),
  );
}

function enfocarPronto(formulario) {
  setTimeout(() => formulario.querySelector('input')?.focus(), 0);
}

function tarjetaFormulario(titulo, explicacion, campos, textoBoton, alEnviar) {
  const error = el('p', { class: 'error-texto', attrs: { role: 'alert' } });
  const formulario = el('form', { class: 'tarjeta-centrada' },
    el('div', { class: 'tarjeta-icono' }, icono('llave')),
    el('h2', { text: t(titulo) }),
    el('p', { class: 'suave', text: t(explicacion) }),
    campos,
    error,
    el('button', { type: 'submit', class: 'boton boton-primario boton-ancho navegable', text: t(textoBoton) }),
  );
  formulario.addEventListener('submit', async evento => {
    evento.preventDefault();
    poner(error);
    const mensaje = await alEnviar(new FormData(formulario));
    if (mensaje) {
      error.textContent = mensaje;
      formulario.querySelector('input').select();
    }
  });
  enfocarPronto(formulario);
  return formulario;
}

async function crear(datos) {
  const contrasena = String(datos.get('contrasena'));
  if (contrasena.length < MINIMO_CONTRASENA) {
    return t('boveda.minimo', { n: MINIMO_CONTRASENA });
  }
  if (contrasena !== String(datos.get('repetir'))) {
    return t('boveda.noCoinciden');
  }
  try {
    estadoBoveda = await api.bovedaCrear(contrasena);
  } catch (error) {
    return mensajeError(error);
  }
  aviso(t('boveda.creada'), 'ok');
  await ui.recargar();
  return null;
}

async function desbloquear(datos) {
  try {
    estadoBoveda = await api.bovedaDesbloquear(String(datos.get('contrasena')));
  } catch (error) {
    return mensajeError(error);
  }
  await ui.recargar();
  ui.enfocarBuscador();
  return null;
}

function formularioCrear() {
  return tarjetaFormulario('boveda.crearTitulo', 'boveda.crearExplicacion', [
    campoContrasena('contrasena', 'boveda.contrasena', 'new-password'),
    campoContrasena('repetir', 'boveda.repetir', 'new-password'),
    el('p', { class: 'nota-aviso' }, icono('aviso'), el('span', { text: t('boveda.sinRecuperacion') })),
  ], 'boveda.crear', crear);
}

function formularioDesbloquear() {
  return tarjetaFormulario('boveda.bloqueadaTitulo', 'boveda.bloqueadaExplicacion', [
    campoContrasena('contrasena', 'boveda.contrasena', 'current-password'),
  ], 'boveda.desbloquear', desbloquear);
}

function pantalla() {
  if (!estado.pro) {
    return tarjetaPro('boveda.proTitulo', ['boveda.pro1', 'boveda.pro2', 'boveda.pro3'], abrirAjustes);
  }
  if (!estadoBoveda.existe) {
    return formularioCrear();
  }
  if (!estadoBoveda.abierta) {
    return formularioDesbloquear();
  }
  return null;
}

// --- Lista abierta

async function bloquear() {
  await intentar(() => api.bovedaBloquear());
  await ui.recargar();
}

function cabeceraLista() {
  return el('div', { class: 'barra-lista' },
    el('span', { class: 'suave', text: t('boveda.cuantos', { n: total }) }),
    boton(t('boveda.bloquear'), bloquear, { icono: 'candado', clase: 'boton-pequeno' }),
  );
}

function fila(entrada, indice) {
  return el('div', { class: 'fila-clip' },
    el('span', { class: 'fila-numero', text: indice < 9 ? String(indice + 1) : '' }),
    el('span', { class: 'icono-tipo' }, icono('llave')),
    el('span', { class: 'fila-texto', text: entrada.titulo }),
    el('span', { class: 'fila-tiempo', text: haceCuanto(entrada.creado, Date.now(), idiomaActual()) }),
  );
}

function vacio() {
  return el('div', { class: 'vacio' },
    icono('llave'),
    el('p', { text: t(estado.consulta ? 'lista.sinResultados' : 'boveda.vacia') }),
  );
}

async function pegar(entrada) {
  await pegarDeBoveda(entrada);
  await leerEstado();
  if (!estadoBoveda.abierta) {
    await ui.recargar();
  }
}

async function borrar(entrada) {
  await intentar(() => api.bovedaBorrar(entrada.id));
  await ui.recargar();
}

function formularioAnadir() {
  const formulario = el('form', { class: 'editor editor-boveda' },
    el('h3', {}, icono('mas'), t('boveda.anadir')),
    el('label', { class: 'etiqueta' },
      el('span', { text: t('boveda.tituloCampo') }),
      el('input', { type: 'text', class: 'campo', name: 'titulo', placeholder: t('boveda.tituloEjemplo'), autocomplete: 'off', required: true }),
    ),
    el('label', { class: 'etiqueta' },
      el('span', { text: t('boveda.secreto') }),
      el('input', { type: 'password', class: 'campo', name: 'secreto', autocomplete: 'new-password', required: true }),
    ),
    el('button', { type: 'submit', class: 'boton navegable', text: t('comun.guardar') }),
  );
  formulario.addEventListener('submit', async evento => {
    evento.preventDefault();
    const datos = new FormData(formulario);
    const nueva = await intentar(() => api.bovedaGuardar(String(datos.get('titulo')).trim(), String(datos.get('secreto'))));
    formulario.reset();
    if (nueva) {
      aviso(t('comun.guardado'), 'ok');
      await ui.recargar({ clave: nueva.id });
    }
  });
  return formulario;
}

function tarjetaEntrada(entrada) {
  return el('div', { class: 'detalle-clip' },
    el('div', { class: 'detalle-meta' },
      el('span', { text: t('boveda.guardadoHace', { cuando: haceCuanto(entrada.creado, Date.now(), idiomaActual()) }) }),
    ),
    el('h3', { class: 'titulo-entrada', text: entrada.titulo }),
    el('p', { class: 'secreto-oculto', attrs: { 'aria-label': t('boveda.oculto') }, text: '•••••••••••' }),
    el('p', { class: 'suave', text: t('boveda.noHistorial') }),
    el('div', { class: 'botonera' },
      boton(t('detalle.pegar'), () => pegar(entrada), { clase: 'boton-primario navegable', titulo: '↵' }),
      botonConfirmar(t('detalle.borrar'), () => borrar(entrada)),
    ),
  );
}

function detalle(entrada) {
  return el('div', { class: 'detalle-boveda' },
    entrada && tarjetaEntrada(entrada),
    formularioAnadir(),
  );
}

export const vistaBoveda = {
  cargar,
  clave: entrada => entrada.id,
  fila,
  detalle,
  activar: pegar,
  pantalla,
  cabeceraLista,
  vacio,
};
