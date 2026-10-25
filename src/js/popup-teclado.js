// Teclado del popup. Tres zonas:
//   lista  → el foco está en el buscador (o en ningún campo): ↑/↓, Enter, Ctrl+1…9, →/Tab abre el panel, Esc…
//   panel  → el foco está en un botón .navegable del panel de detalle: ↑/↓/Tab/Shift+Tab, Enter, ←/Esc vuelve
//   campo  → el foco está en un campo de un formulario: solo Esc (vuelve a la lista)

const PESTANAS_ALT = ['historial', 'fragmentos', 'capturas', 'boveda'];

function esCampo(nodo) {
  return nodo instanceof HTMLElement && nodo.matches('input, textarea, select') && nodo.id !== 'buscador';
}

function zonaDe(nodo) {
  if (esCampo(nodo)) {
    return 'campo';
  }
  if (nodo instanceof HTMLElement && nodo.closest('.panel-detalle, .pantalla') && nodo.matches('button, a')) {
    return 'panel';
  }
  return 'lista';
}

function navegables(contenedor) {
  return contenedor ? [...contenedor.querySelectorAll('.navegable:not([disabled])')] : [];
}

function moverFoco(evento, paso) {
  const lista = navegables(evento.target.closest('.panel-detalle, .pantalla'));
  if (!lista.length) {
    return;
  }
  const actual = lista.indexOf(evento.target);
  const siguiente = actual === -1 ? 0 : actual + paso;
  const destino = lista[Math.max(0, Math.min(lista.length - 1, siguiente))];
  destino.focus();
  destino.scrollIntoView({ block: 'nearest' });
}

function teclasPanel(evento, control) {
  if (evento.key === 'ArrowDown' || (evento.key === 'Tab' && !evento.shiftKey)) {
    evento.preventDefault();
    moverFoco(evento, 1);
    return;
  }
  if (evento.key === 'ArrowUp' || (evento.key === 'Tab' && evento.shiftKey)) {
    evento.preventDefault();
    moverFoco(evento, -1);
    return;
  }
  if (evento.key === 'ArrowLeft' || evento.key === 'Escape') {
    evento.preventDefault();
    control.volver();
  }
}

function teclasCampo(evento, control) {
  if (evento.key === 'Escape') {
    evento.preventDefault();
    control.volver();
  }
}

function numeroDe(evento) {
  const coincidencia = /^(?:Digit|Numpad)([1-9])$/.exec(evento.code);
  return coincidencia ? Number(coincidencia[1]) : null;
}

function teclasMovimiento(evento, control, mod) {
  const pasos = { ArrowDown: 1, ArrowUp: -1, PageDown: 8, PageUp: -8 };
  if (pasos[evento.key]) {
    control.mover(pasos[evento.key]);
    return true;
  }
  if (mod && (evento.code === 'KeyJ' || evento.code === 'KeyK')) {
    control.mover(evento.code === 'KeyJ' ? 1 : -1);
    return true;
  }
  return false;
}

// → solo abre el panel si el cursor del buscador ya está al final (si no, mueve el cursor).
function cursorAlFinal(nodo) {
  if (!(nodo instanceof HTMLInputElement)) {
    return true;
  }
  return nodo.selectionStart === nodo.value.length && nodo.selectionEnd === nodo.value.length;
}

function teclasLista(evento, control) {
  const mod = evento.ctrlKey || evento.metaKey;
  if (teclasMovimiento(evento, control, mod)) {
    evento.preventDefault();
    return;
  }
  const numero = numeroDe(evento);
  if (mod && numero) {
    evento.preventDefault();
    control.activar(numero - 1);
    return;
  }
  if (evento.key === 'Enter' && !evento.isComposing) {
    evento.preventDefault();
    control.activar();
    return;
  }
  if ((evento.key === 'Tab' && !evento.shiftKey) || (evento.key === 'ArrowRight' && cursorAlFinal(evento.target))) {
    evento.preventDefault();
    control.entrarPanel();
    return;
  }
  if (evento.key === 'Tab') {
    evento.preventDefault();
    return;
  }
  if (evento.key === 'Escape') {
    evento.preventDefault();
    control.escape();
    return;
  }
  control.teclasVista(evento);
}

// Atajos que valen en cualquier zona.
function teclasGlobales(evento, control) {
  const mod = evento.ctrlKey || evento.metaKey;
  const numero = numeroDe(evento);
  if (evento.altKey && !mod && numero && numero <= PESTANAS_ALT.length) {
    evento.preventDefault();
    control.cambiarPestana(PESTANAS_ALT[numero - 1]);
    return true;
  }
  if (mod && evento.code === 'Comma') {
    evento.preventDefault();
    control.abrirAjustes();
    return true;
  }
  return false;
}

export function crearTeclado(control) {
  return function alPulsar(evento) {
    if (teclasGlobales(evento, control)) {
      return;
    }
    const zona = zonaDe(evento.target);
    if (zona === 'campo') {
      teclasCampo(evento, control);
    } else if (zona === 'panel') {
      teclasPanel(evento, control);
    } else {
      teclasLista(evento, control);
    }
  };
}

// Primer control para poner el foco al abrir un panel: un botón navegable o, si no hay, un campo.
export function primerNavegable(contenedor) {
  return navegables(contenedor)[0] ?? contenedor?.querySelector('input, textarea, select') ?? null;
}
