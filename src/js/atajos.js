// Atajo global: del evento de teclado al formato de Tauri y vuelta a texto legible.
// Funciones puras (reciben el evento o el texto; no tocan el DOM).

export const ATAJO_DEFECTO = 'CommandOrControl+Alt+KeyV';

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

// "CommandOrControl+Alt+KeyV" → ["Ctrl", "Alt", "V"] (o ["⌘", "⌥", "V"] en Mac).
export function partesLegibles(atajo, { mac = false, idioma = 'es' } = {}) {
  const partes = ordenar(String(atajo || ATAJO_DEFECTO).split('+').filter(Boolean));
  const simbolos = mac ? MODIFICADORES_MAC : MODIFICADORES_PC;
  return partes.map(parte => simbolos[parte] ?? nombreTecla(parte, idioma));
}

// "CommandOrControl+Alt+KeyV" → "Ctrl+Alt+V" (o "⌘⌥V" en Mac).
export function atajoLegible(atajo, opciones = {}) {
  return partesLegibles(atajo, opciones).join(opciones.mac ? '' : '+');
}
