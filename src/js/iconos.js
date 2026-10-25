// Iconos SVG de trazo fino creados con createElementNS (sin recursos externos).
// Todos usan currentColor, así que heredan el color del texto.

const SVG_NS = 'http://www.w3.org/2000/svg';

// Cada icono: lista de figuras [etiqueta, atributos].
const FIGURAS = {
  buscar: [['circle', { cx: 11, cy: 11, r: 6.5 }], ['path', { d: 'M20 20l-4.2-4.2' }]],
  candado: [['rect', { x: 5, y: 11, width: 14, height: 9.5, rx: 2 }], ['path', { d: 'M8.5 11V7.5a3.5 3.5 0 0 1 7 0V11' }]],
  fijado: [['path', { d: 'M9 3.5h6l-1 5.5 3 3v2H7v-2l3-3z' }], ['path', { d: 'M12 14v6.5' }]],
  texto: [['path', { d: 'M5 6.5h14M5 12h14M5 17.5h9' }]],
  enlace: [['path', { d: 'M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.3 1.3' }], ['path', { d: 'M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.3-1.3' }]],
  imagen: [['rect', { x: 3.5, y: 4.5, width: 17, height: 15, rx: 2 }], ['circle', { cx: 9, cy: 10, r: 1.6 }], ['path', { d: 'M20.5 16l-5-5-9 8.5' }]],
  codigo: [['path', { d: 'M9 8l-4 4 4 4M15 8l4 4-4 4' }]],
  calculadora: [['rect', { x: 5, y: 3, width: 14, height: 18, rx: 2 }], ['path', { d: 'M8.5 7h7M8.5 12h1M14.5 12h1M8.5 16h1M14.5 16h1' }]],
  fragmento: [['path', { d: 'M6 4.5h9l3 3v12H6z' }], ['path', { d: 'M9 11h6M9 15h4' }]],
  llave: [['circle', { cx: 8, cy: 15, r: 3.5 }], ['path', { d: 'M10.5 12.5L19 4M16 7l2 2M13.5 9.5l2 2' }]],
  chispa: [['path', { d: 'M12 3.5l1.8 5 5 1.8-5 1.8-1.8 5-1.8-5-5-1.8 5-1.8z' }], ['path', { d: 'M18.5 16v4M16.5 18h4' }]],
  dado: [['rect', { x: 4, y: 4, width: 16, height: 16, rx: 3 }], ['path', { d: 'M9 9h.01M15 15h.01M15 9h.01M9 15h.01M12 12h.01' }]],
  rayo: [['path', { d: 'M13 3L5 13.5h6L10 21l8-10.5h-6z' }]],
  mas: [['path', { d: 'M12 5v14M5 12h14' }]],
  reloj: [['circle', { cx: 12, cy: 12, r: 8 }], ['path', { d: 'M12 7.5V12l3 2' }]],
  hash: [['path', { d: 'M5 9h14M5 15h14M10 4l-2 16M16 4l-2 16' }]],
  escudo: [['path', { d: 'M12 3.5l7 3v5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5v-5z' }]],
  teclado: [['rect', { x: 3, y: 6, width: 18, height: 12, rx: 2 }], ['path', { d: 'M7 10h.01M11 10h.01M15 10h.01M7 14h10' }]],
  ajustes: [['circle', { cx: 12, cy: 12, r: 3 }], ['path', { d: 'M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8' }]],
  info: [['circle', { cx: 12, cy: 12, r: 8.5 }], ['path', { d: 'M12 11v5.5M12 7.5h.01' }]],
  insignia: [['path', { d: 'M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z' }]],
  check: [['path', { d: 'M5 12.5l4.5 4.5L19 7.5' }]],
  aviso: [['path', { d: 'M12 4l9 16H3z' }], ['path', { d: 'M12 10v4.5M12 17.5h.01' }]],
};

export function icono(nombre, clase = '') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', `icono ${clase}`.trim());
  for (const [etiqueta, atributos] of FIGURAS[nombre] ?? []) {
    const figura = document.createElementNS(SVG_NS, etiqueta);
    for (const [atributo, valor] of Object.entries(atributos)) {
      figura.setAttribute(atributo, String(valor));
    }
    svg.append(figura);
  }
  return svg;
}
