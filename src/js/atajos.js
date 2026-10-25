// Atajos globales: del evento de teclado al formato de Tauri y vuelta a texto legible,
// y comprobación de duplicados entre las tres acciones. Funciones puras (no tocan el DOM).
// Una cadena vacía significa «atajo desactivado».

// Sugerencias del contrato (Ajustes.atajos).
export const ATAJOS_DEFECTO = Object.freeze({
  popup: 'CommandOrControl+Alt+KeyV',
  captura: 'CommandOrControl+Alt+KeyC',
  video: 'CommandOrControl+Alt+KeyR',
});

export const ACCIONES_ATAJO = Object.keys(ATAJOS_DEFECTO);

const ORDEN_MODIFICADORES = ['CommandOrControl', 'Alt', 'Shift'];

const TECLAS_MODIFICADORAS = new Set([
  'ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight',
  'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'OSLeft', 'OSRight',
]);

const TECLA_VALIDA = new RegExp([
  '^(Key[A-Z]',
  'Digit\\d',
  'Numpad\\d',
  'F([1-9]|1\\d|2[0-4])',
  'Space|Enter|Backspace|Insert|Delete|Home|End|PageUp|PageDown',
  'Arrow(Up|Down|Left|Right)',
  'Semicolon|Comma|Period|Slash|Backquote|BracketLeft|BracketRight',
  'Backslash|IntlBackslash|Quote|Minus|Equal)$',
].join('|'));

// Nombres de las teclas de símbolos según la distribución habitual de cada idioma.
const SIMBOLOS = {
  es: {
    Semicolon: 'Ñ', Quote: '´', Backquote: 'º', BracketLeft: '`', BracketRight: '+',
    Backslash: 'Ç', IntlBackslash: '<', Minus: "'", Equal: '¡', Slash: '-',
    Comma: ',', Period: '.',
  },
  en: {
    Semicolon: ';', Quote: "'", Backquote: '`', BracketLeft: '[', BracketRight: ']',
    Backslash: '\\', IntlBackslash: '<', Minus: '-', Equal: '=', Slash: '/',
    Comma: ',', Period: '.',
  },
};

const NOMBRES = {
  es: {
    Space: 'Espacio', Enter: 'Intro', Backspace: 'Retroceso', Insert: 'Insert', Delete: 'Supr',
    Home: 'Inicio', End: 'Fin', PageUp: 'RePág', PageDown: 'AvPág',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  },
  en: {
    Space: 'Space', Enter: 'Enter', Backspace: 'Backspace', Insert: 'Insert', Delete: 'Del',
    Home: 'Home', End: 'End', PageUp: 'PgUp', PageDown: 'PgDn',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  },
};

const MODIFICADORES_MAC = { CommandOrControl: '⌘', Alt: '⌥', Shift: '⇧' };
const MODIFICADORES_PC = { CommandOrControl: 'Ctrl', Alt: 'Alt', Shift: 'Shift' };

export function esModificador(code) {
  return TECLAS_MODIFICADORAS.has(code);
}

// Convierte un evento keydown en un atajo de Tauri.
// Devuelve {atajo} si es válido, {error: "atajo_sin_modificador" | "atajo_tecla_invalida"}
// o {pendiente: true} si solo se han pulsado modificadores.
export function atajoDeEvento(evento) {
  if (!evento?.code || esModificador(evento.code)) {
    return { pendiente: true };
  }
  const modificadores = [];
  if (evento.ctrlKey || evento.metaKey) modificadores.push('CommandOrControl');
  if (evento.altKey) modificadores.push('Alt');
  if (evento.shiftKey) modificadores.push('Shift');
  if (!modificadores.length) {
    return { error: 'atajo_sin_modificador' };
  }
  if (!TECLA_VALIDA.test(evento.code)) {
    return { error: 'atajo_tecla_invalida' };
  }
  return { atajo: [...modificadores, evento.code].join('+') };
}

export function nombreTecla(code, idioma = 'es') {
  const lengua = idioma === 'en' ? 'en' : 'es';
  if (SIMBOLOS[lengua][code]) return SIMBOLOS[lengua][code];
  if (NOMBRES[lengua][code]) return NOMBRES[lengua][code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
  return code;
}

function ordenar(partes) {
  const modificadores = ORDEN_MODIFICADORES.filter(modificador => partes.includes(modificador));
  const teclas = partes.filter(parte => !ORDEN_MODIFICADORES.includes(parte));
  return [...modificadores, ...teclas];
}

// "CommandOrControl+Alt+KeyV" → ["Ctrl", "Alt", "V"] (o ["⌘", "⌥", "V"] en Mac). Vacío → [].
export function partesLegibles(atajo, { mac = false, idioma = 'es' } = {}) {
  const partes = ordenar(String(atajo ?? '').split('+').filter(Boolean));
  const simbolos = mac ? MODIFICADORES_MAC : MODIFICADORES_PC;
  return partes.map(parte => simbolos[parte] ?? nombreTecla(parte, idioma));
}

// "CommandOrControl+Alt+KeyV" → "Ctrl+Alt+V" (o "⌘⌥V" en Mac). Vacío → "".
export function atajoLegible(atajo, opciones = {}) {
  return partesLegibles(atajo, opciones).join(opciones.mac ? '' : '+');
}

// Mismo atajo escrito con los modificadores en otro orden → misma cadena.
export function normalizarAtajo(atajo) {
  return ordenar(String(atajo ?? '').split('+').filter(Boolean)).join('+');
}

// Los tres atajos con las sugerencias para lo que falte (lo vacío se respeta: está desactivado).
export function completarAtajos(atajos) {
  const salida = { ...ATAJOS_DEFECTO };
  for (const accion of ACCIONES_ATAJO) {
    if (typeof atajos?.[accion] === 'string') {
      salida[accion] = atajos[accion];
    }
  }
  return salida;
}

// Acción que ya usa `atajo` (sin contar `excepto`) o null. Los vacíos nunca chocan.
export function quienUsa(atajos, atajo, excepto = null) {
  const buscado = normalizarAtajo(atajo);
  if (!buscado) {
    return null;
  }
  return ACCIONES_ATAJO.find(accion => accion !== excepto && normalizarAtajo(atajos?.[accion]) === buscado) ?? null;
}

// Parejas de acciones con la misma combinación, p. ej. [["popup", "video"]].
export function duplicados(atajos) {
  const parejas = [];
  ACCIONES_ATAJO.forEach((accion, posicion) => {
    for (const otra of ACCIONES_ATAJO.slice(posicion + 1)) {
      const valor = normalizarAtajo(atajos?.[accion]);
      if (valor && valor === normalizarAtajo(atajos?.[otra])) {
        parejas.push([accion, otra]);
      }
    }
  });
  return parejas;
}

// {popup: "Ctrl+Alt+V", captura: "", …} para pintar los tres a la vez.
export function atajosLegibles(atajos, opciones = {}) {
  return Object.fromEntries(ACCIONES_ATAJO.map(accion => [accion, atajoLegible(atajos?.[accion], opciones)]));
}
