// Formatos legibles para capturas y vídeos: tamaños de archivo, duraciones y fechas.

const UNIDADES = ['B', 'KB', 'MB', 'GB', 'TB'];

function dos(numero) {
  return String(numero).padStart(2, '0');
}

// 1536 → "1,5 KB" (es) o "1.5 KB" (en). Base 1024; un decimal por debajo de 10.
export function tamanoLegible(bytes, idioma = 'es') {
  let valor = Number(bytes);
  if (!Number.isFinite(valor) || valor < 0) {
    return '—';
  }
  let unidad = 0;
  while (valor >= 1024 && unidad < UNIDADES.length - 1) {
    valor /= 1024;
    unidad += 1;
  }
  const decimales = unidad > 0 && valor < 10 ? 1 : 0;
  const texto = (Math.round(valor * 10 ** decimales) / 10 ** decimales).toFixed(decimales);
  return `${idioma === 'en' ? texto : texto.replace('.', ',')} ${UNIDADES[unidad]}`;
}

// 75 → "01:15"; a partir de una hora, "1:02:03".
export function duracion(segundos) {
  const total = Math.max(0, Math.floor(Number(segundos) || 0));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const resto = total % 60;
  return horas ? `${horas}:${dos(minutos)}:${dos(resto)}` : `${dos(minutos)}:${dos(resto)}`;
}

// Fecha y hora locales: "25/10/2026 14:03" (es) o "2026-10-25 14:03" (en).
export function fechaHora(marca, idioma = 'es') {
  const fecha = new Date(Number(marca));
  if (Number.isNaN(fecha.getTime())) {
    return '—';
  }
  const dia = dos(fecha.getDate());
  const mes = dos(fecha.getMonth() + 1);
  const ano = fecha.getFullYear();
  const hora = `${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
  return idioma === 'en' ? `${ano}-${mes}-${dia} ${hora}` : `${dia}/${mes}/${ano} ${hora}`;
}
