// Campo de texto temporal sobre el lienzo del editor de capturas: Enter fija, Esc descarta y al perder el foco se fija.
// El campo crece con lo que se escribe.

import { el } from './dom.js';
import { t } from './i18n.js';
import { FUENTE_TEXTO } from './captura-lienzo.js';

// anotacion: {tipo: 'texto', x, y, color, grosor}. alTerminar(anotacion | null) se llama una sola vez.
export function abrirTexto(capa, anotacion, alTerminar) {
  const entrada = el('input', {
    type: 'text',
    class: 'texto-captura',
    autocomplete: 'off',
    spellcheck: false,
    attrs: { 'aria-label': t('captura.texto') },
  });
  entrada.style.transform = `translate(${Math.round(anotacion.x)}px, ${Math.round(anotacion.y)}px)`;
  entrada.style.color = anotacion.color;
  entrada.style.font = `600 ${anotacion.grosor}px ${FUENTE_TEXTO}`;
  let terminado = false;
  entrada.addEventListener('input', () => {
    entrada.size = Math.max(2, Array.from(entrada.value).length + 1);
  });
  entrada.size = 2;

  const fijar = (guardarlo = true) => {
    if (terminado) {
      return;
    }
    terminado = true;
    window.removeEventListener('focus', reenfocar);
    const texto = entrada.value;
    entrada.remove();
    alTerminar(guardarlo ? { ...anotacion, texto } : null);
  };

  entrada.addEventListener('keydown', evento => {
    evento.stopPropagation();
    if (evento.key === 'Enter') {
      evento.preventDefault();
      fijar(true);
    } else if (evento.key === 'Escape') {
      evento.preventDefault();
      fijar(false);
    }
  });
  // Al perder el foco se fija lo escrito; si aún está vacío, el campo sigue abierto (p. ej. si la ventana
  // pierde el foco un momento). Pulsar en otro sitio del lienzo lo cierra desde captura.js.
  entrada.addEventListener('blur', () => {
    if (entrada.value.trim()) {
      fijar(true);
    }
  });
  entrada.addEventListener('pointerdown', evento => evento.stopPropagation());
  // Si la ventana recupera el foco, se sigue escribiendo en el campo.
  const reenfocar = () => entrada.focus();
  window.addEventListener('focus', reenfocar);
  capa.append(entrada);
  entrada.focus();
  requestAnimationFrame(() => entrada.focus());
  return { fijar };
}
