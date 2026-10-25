// Teclado del popup. Tres zonas:
//   lista  → el foco está en el buscador (o en ningún campo): ↑/↓, Enter, Ctrl+1…9, Tab, Esc…
//   panel  → el foco está en un botón .navegable del panel de detalle: ↑/↓/Tab, Enter, Shift+Tab/Esc
//   campo  → el foco está en un campo de un formulario: solo Esc (vuelve al buscador)

const PESTANAS_ALT = ['historial', 'fragmentos', 'herramientas', 'boveda'];

function esCampo(nodo) {
  return nodo instanceof HTMLElement && nodo.matches('input, textarea, select') && nodo.id !== 'buscador';
}

function zonaDe(nodo) {
  if (esCampo(nodo)) {
    return 'campo';
  }
  if (nodo instanceof HTMLElement && nodo.closest('.detalle, .pantalla') && nodo.matches('button, a')) {
    return 'panel';
  }
  return 'lista';
}

function navegables(contenedor) {
  return [...contenedor.querySelectorAll('.navegable:not([disabled])')];
}

function moverFoco(evento, paso) {
  const contenedor = evento.target.closest('.detalle, .pantalla');
  const lista = navegables(contenedor);
  const actual = lista.indexOf(evento.target);
  if (!lista.length) {
    return;
  }
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
  if (evento.key === 'ArrowUp') {
    evento.preventDefault();
    moverFoco(evento, -1);
    return;
  }
  if (evento.key === 'Escape' || (evento.key === 'Tab' && evento.shiftKey)) {
    evento.preventDefault();
    control.enfocarBuscador();
  }
}

function teclasCampo(evento, control) {
  if (evento.key === 'Escape') {
    evento.preventDefault();
    control.enfocarBuscador();
  }
}

function numeroDe(evento) {
  const coincidencia = /^(?:Digit|Numpad)([1-9])$/.exec(evento.code);
  return coincidencia ? Number(coincidencia[1]) : null;
}

function teclasMovimiento(evento, control, mod) {
  if (evento.key === 'ArrowDown' || (mod && evento.code === 'KeyJ')) {
    control.mover(1);
    return true;
  }
  if (evento.key === 'ArrowUp' || (mod && evento.code === 'KeyK')) {
    control.mover(-1);
    return true;
  }
  if (evento.key === 'PageDown') {
    control.mover(8);
    return true;
  }
  if (evento.key === 'PageUp') {
    control.mover(-8);
    return true;
  }
  return false;
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
  if (evento.key === 'Tab') {
    evento.preventDefault();
    if (!evento.shiftKey) {
      control.entrarPanel();
    }
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

export function primerNavegable(contenedor) {
  return navegables(contenedor)[0] ?? null;
}
