// Construcción del DOM con nodos y textContent (CSP estricta: los clips son datos no confiables).
//
// el(etiqueta, props, ...hijos)
//   props.class    texto o lista (se ignoran los valores vacíos)
//   props.text     textContent
//   props.dataset  objeto para data-*
//   props.attrs    atributos con setAttribute
//   props.on       {evento: función}
//   otras claves   se asignan como propiedad (value, type, disabled, checked…)

function ponerClase(nodo, valor) {
  nodo.className = Array.isArray(valor) ? valor.filter(Boolean).join(' ') : valor;
}

function ponerAtributos(nodo, atributos) {
  for (const [nombre, valor] of Object.entries(atributos)) {
    if (valor === false || valor === null || valor === undefined) {
      continue;
    }
    nodo.setAttribute(nombre, valor === true ? '' : String(valor));
  }
}

function ponerEventos(nodo, eventos) {
  for (const [evento, funcion] of Object.entries(eventos)) {
    nodo.addEventListener(evento, funcion);
  }
}

function aplicarProp(nodo, clave, valor) {
  if (/html/i.test(clave)) {
    throw new Error(`Propiedad no permitida: ${clave}`);
  }
  switch (clave) {
    case 'class': ponerClase(nodo, valor); break;
    case 'text': nodo.textContent = String(valor); break;
    case 'dataset': Object.assign(nodo.dataset, valor); break;
    case 'attrs': ponerAtributos(nodo, valor); break;
    case 'on': ponerEventos(nodo, valor); break;
    default: nodo[clave] = valor;
  }
}

export function anadir(nodo, ...hijos) {
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo === null || hijo === undefined || hijo === false) {
      continue;
    }
    nodo.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
  return nodo;
}

export function el(etiqueta, props = {}, ...hijos) {
  const nodo = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(props ?? {})) {
    if (valor === undefined || valor === null) {
      continue;
    }
    aplicarProp(nodo, clave, valor);
  }
  return anadir(nodo, hijos);
}

export function limpiar(nodo) {
  nodo.replaceChildren();
  return nodo;
}

// Reemplaza el contenido de un nodo por los hijos dados.
export function poner(nodo, ...hijos) {
  limpiar(nodo);
  return anadir(nodo, hijos);
}
