// Iconos SVG de trazo fino creados con createElementNS (sin recursos externos).
// Todos usan currentColor, así que heredan el color del texto.

const SVG_NS = 'http://www.w3.org/2000/svg';

// Cada icono: lista de figuras [etiqueta, atributos].
const FIGURAS = {
  // Popup y ajustes
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
  mas: [['path', { d: 'M12 5v14M5 12h14' }]],
  reloj: [['circle', { cx: 12, cy: 12, r: 8 }], ['path', { d: 'M12 7.5V12l3 2' }]],
  hash: [['path', { d: 'M5 9h14M5 15h14M10 4l-2 16M16 4l-2 16' }]],
  escudo: [['path', { d: 'M12 3.5l7 3v5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5v-5z' }]],
  teclado: [['rect', { x: 3, y: 6, width: 18, height: 12, rx: 2 }], ['path', { d: 'M7 10h.01M11 10h.01M15 10h.01M7 14h10' }]],
  ajustes: [['path', { d: 'M4 7h9M17 7h3M4 17h3M11 17h9' }], ['circle', { cx: 15, cy: 7, r: 2 }], ['circle', { cx: 9, cy: 17, r: 2 }]],
  info: [['circle', { cx: 12, cy: 12, r: 8.5 }], ['path', { d: 'M12 11v5.5M12 7.5h.01' }]],
  check: [['path', { d: 'M5 12.5l4.5 4.5L19 7.5' }]],
  aviso: [['path', { d: 'M12 4l9 16H3z' }], ['path', { d: 'M12 10v4.5M12 17.5h.01' }]],
  volver: [['path', { d: 'M10 6l-6 6 6 6M4.5 12H20' }]],
  carpeta: [['path', { d: 'M3.5 7a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z' }]],
  asa: [['path', { d: 'M20 11l-9 9M20 16l-4 4' }]],
  // Capturas y vídeo
  captura: [['path', { d: 'M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16' }], ['path', { d: 'M9 12h6M12 9v6' }]],
  video: [['rect', { x: 3, y: 6, width: 13, height: 12, rx: 2 }], ['path', { d: 'M16 10.5l5-3v9l-5-3z' }]],
  grabar: [['circle', { cx: 12, cy: 12, r: 8 }], ['circle', { cx: 12, cy: 12, r: 3.5, class: 'relleno' }]],
  detener: [['rect', { x: 7, y: 7, width: 10, height: 10, rx: 1.5, class: 'relleno' }]],
  pantalla: [['rect', { x: 3, y: 4.5, width: 18, height: 12, rx: 1.5 }], ['path', { d: 'M8.5 20h7M12 16.5V20' }]],
  // Editor de capturas
  lapiz: [['path', { d: 'M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5z' }], ['path', { d: 'M13.5 7l3 3' }]],
  linea: [['path', { d: 'M5 19L19 5' }]],
  flecha: [['path', { d: 'M5 19L19 5M10 5h9v9' }]],
  rectangulo: [['rect', { x: 4, y: 6, width: 16, height: 12, rx: 1 }]],
  marcador: [['path', { d: 'M9 15l-2.5 5H14l1-2' }], ['path', { d: 'M9 15l7.5-11 4 2.5L13 17.5z' }]],
  letra: [['path', { d: 'M6 6.5V5h12v1.5M12 5v14M9.5 19h5' }]],
  deshacer: [['path', { d: 'M9 14L4.5 9.5 9 5' }], ['path', { d: 'M4.5 9.5H14a5.5 5.5 0 0 1 0 11h-3' }]],
  copiar: [['rect', { x: 8.5, y: 8.5, width: 11.5, height: 11.5, rx: 2 }], ['path', { d: 'M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5' }]],
  guardar: [['path', { d: 'M12 4v10.5M7.5 10l4.5 4.5 4.5-4.5' }], ['path', { d: 'M4.5 15.5V18a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2.5' }]],
  cerrar: [['path', { d: 'M6 6l12 12M18 6L6 18' }]],
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
