// Geometría pura de la selección del editor de capturas.
// Todo va en píxeles CSS de la ventana salvo aFisicos(), que pasa a píxeles de la imagen congelada.
// Un rectángulo es {x, y, ancho, alto} con ancho y alto nunca negativos.

export const TAM_ASA = 8;
export const ASAS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

function entre(valor, minimo, maximo) {
  return Math.min(Math.max(valor, minimo), maximo);
}

// Rectángulo a partir de dos esquinas cualesquiera (arrastre en cualquier dirección).
export function normalizar(x1, y1, x2, y2) {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    ancho: Math.abs(x2 - x1),
    alto: Math.abs(y2 - y1),
  };
}

// Recorta el rectángulo a la zona [0, limites.ancho] × [0, limites.alto].
export function limitar(rect, limites) {
  const izquierda = entre(rect.x, 0, limites.ancho);
  const arriba = entre(rect.y, 0, limites.alto);
  const derecha = entre(rect.x + rect.ancho, 0, limites.ancho);
  const abajo = entre(rect.y + rect.alto, 0, limites.alto);
  return { x: izquierda, y: arriba, ancho: derecha - izquierda, alto: abajo - arriba };
}

export function esValida(rect, minimo = 3) {
  return Boolean(rect) && rect.ancho >= minimo && rect.alto >= minimo;
}

export function contiene(rect, px, py) {
  return Boolean(rect) && px >= rect.x && px <= rect.x + rect.ancho && py >= rect.y && py <= rect.y + rect.alto;
}

// Centro de cada asa: esquinas y puntos medios de los lados.
export function centrosAsas(rect) {
  const { x, y, ancho, alto } = rect;
  const medioX = x + ancho / 2;
  const medioY = y + alto / 2;
  return {
    nw: { x, y },
    n: { x: medioX, y },
    ne: { x: x + ancho, y },
    e: { x: x + ancho, y: medioY },
    se: { x: x + ancho, y: y + alto },
    s: { x: medioX, y: y + alto },
    sw: { x, y: y + alto },
    w: { x, y: medioY },
  };
}

// Asa bajo el puntero (con algo de margen para acertar fácil) o null.
export function asaEn(rect, px, py, tolerancia = TAM_ASA) {
  if (!rect) {
    return null;
  }
  const centros = centrosAsas(rect);
  for (const asa of ASAS) {
    const centro = centros[asa];
    if (Math.abs(px - centro.x) <= tolerancia && Math.abs(py - centro.y) <= tolerancia) {
      return asa;
    }
  }
  return null;
}

// Desplaza sin cambiar el tamaño y sin salirse de los límites.
export function mover(rect, dx, dy, limites) {
  return {
    x: entre(rect.x + dx, 0, Math.max(0, limites.ancho - rect.ancho)),
    y: entre(rect.y + dy, 0, Math.max(0, limites.alto - rect.alto)),
    ancho: rect.ancho,
    alto: rect.alto,
  };
}

// Ajusta con un asa. Se calcula siempre desde el rectángulo del inicio del arrastre,
// así que si el puntero cruza el lado contrario la selección se da la vuelta sin saltos.
export function redimensionar(inicial, asa, px, py, limites) {
  let izquierda = inicial.x;
  let arriba = inicial.y;
  let derecha = inicial.x + inicial.ancho;
  let abajo = inicial.y + inicial.alto;
  if (asa.includes('w')) izquierda = px;
  if (asa.includes('e')) derecha = px;
  if (asa.includes('n')) arriba = py;
  if (asa.includes('s')) abajo = py;
  return limitar(normalizar(izquierda, arriba, derecha, abajo), limites);
}

// De píxeles CSS a píxeles físicos de la imagen. Se redondean los bordes (no el tamaño)
// para que dos zonas contiguas no dejen huecos ni se solapen.
export function aFisicos(rect, escalaX, escalaY = escalaX, limites = null) {
  let izquierda = Math.round(rect.x * escalaX);
  let arriba = Math.round(rect.y * escalaY);
  let derecha = Math.round((rect.x + rect.ancho) * escalaX);
  let abajo = Math.round((rect.y + rect.alto) * escalaY);
  if (limites) {
    izquierda = entre(izquierda, 0, limites.ancho);
    derecha = entre(derecha, 0, limites.ancho);
    arriba = entre(arriba, 0, limites.alto);
    abajo = entre(abajo, 0, limites.alto);
  }
  return { x: izquierda, y: arriba, ancho: derecha - izquierda, alto: abajo - arriba };
}

// Dónde va la barra de herramientas: debajo de la selección; si no cabe, encima; si tampoco, dentro.
// Se alinea con el borde derecho de la selección y nunca se sale de la ventana.
export function posicionBarra(rect, barra, ventana, margen = 8) {
  const maximoX = Math.max(margen, ventana.ancho - barra.ancho - margen);
  const x = entre(rect.x + rect.ancho - barra.ancho, margen, maximoX);
  const debajo = rect.y + rect.alto + margen;
  if (debajo + barra.alto + margen <= ventana.alto) {
    return { x, y: debajo, lugar: 'debajo' };
  }
  const encima = rect.y - margen - barra.alto;
  if (encima >= margen) {
    return { x, y: encima, lugar: 'encima' };
  }
  const maximoY = Math.max(margen, ventana.alto - barra.alto - margen);
  return { x, y: entre(rect.y + rect.alto - barra.alto - margen, margen, maximoY), lugar: 'dentro' };
}

// Etiqueta «ancho × alto»: encima de la esquina superior izquierda o, si no cabe, dentro.
export function posicionEtiqueta(rect, etiqueta, margen = 6) {
  const y = rect.y - etiqueta.alto - margen;
  return y >= 0 ? { x: rect.x, y, dentro: false } : { x: rect.x + margen, y: rect.y + margen, dentro: true };
}
