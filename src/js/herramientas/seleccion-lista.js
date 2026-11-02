// Operaciones puras para seleccionar elementos de una lista.

function comoArray(seleccion) {
  return Array.from(seleccion ?? []);
}

export function ampliar(seleccion, ancla, destino, ids) {
  const lista = Array.from(ids ?? []);
  const inicio = lista.indexOf(ancla);
  const fin = lista.indexOf(destino);
  if (inicio === -1 || fin === -1) return comoArray(seleccion);
  const desde = Math.min(inicio, fin);
  const hasta = Math.max(inicio, fin);
  return lista.slice(desde, hasta + 1);
}

export function alternar(seleccion, id) {
  const actual = comoArray(seleccion);
  const posicion = actual.indexOf(id);
  if (posicion === -1) return [...actual, id];
  return actual.filter((_, indice) => indice !== posicion);
}

export function textosParaPegar(clips, seleccion) {
  const ids = new Set(seleccion ?? []);
  const textos = [];
  let saltadas = 0;
  for (const clip of clips ?? []) {
    if (!ids.has(clip.id)) continue;
    if (clip.tipo === 'imagen') {
      saltadas += 1;
    } else if (clip.tipo === 'texto') {
      textos.push(String(clip.texto ?? ''));
    }
  }
  return { texto: textos.join('\n'), saltadas };
}
