/**
 * Métricas de cuánto tarda un lavado.
 *
 * Solo entran los lavados con tiempos medidos de verdad. Los que vienen del
 * registro histórico o se cargaron días después tienen horarios estimados
 * (inicio = llegada, fin = llegada + un rato): sumarlos daría un promedio
 * inventado, que es peor que no tener el dato.
 *
 * Módulo puro (sin Prisma) para poder testearlo.
 */

export interface LavadoMedido {
  servicio: string;
  tipoVehiculo: string;
  llegadaMs: number;
  inicioMs: number | null;
  finMs: number | null;
  entregadoMs: number | null;
  tiemposReales: boolean;
}

export interface Duraciones {
  /** Cantidad de lavados que aportaron a estos promedios */
  muestra: number;
  /** Minutos promedio de cada tramo, null si ningún lavado lo tiene */
  espera: number | null;
  lavado: number | null;
  entrega: number | null;
  total: number | null;
  /** Minutos del lavado más rápido y del más lento (tramo inicio→fin) */
  lavadoMin: number | null;
  lavadoMax: number | null;
}

export interface Corte {
  clave: string;
  duraciones: Duraciones;
}

const VACIO: Duraciones = {
  muestra: 0,
  espera: null,
  lavado: null,
  entrega: null,
  total: null,
  lavadoMin: null,
  lavadoMax: null,
};

const minutos = (desde: number, hasta: number) => (hasta - desde) / 60000;

function promedio(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return Math.round(valores.reduce((s, v) => s + v, 0) / valores.length);
}

/**
 * Un lavado sirve para medir si sus tiempos son reales y el tramo inicio→fin
 * está completo y en orden. Los tramos negativos vienen de datos mal cargados
 * y se descartan.
 */
export function esMedible(l: LavadoMedido): boolean {
  return l.tiemposReales && l.inicioMs != null && l.finMs != null && l.finMs >= l.inicioMs;
}

export function calcularDuraciones(lavados: LavadoMedido[]): Duraciones {
  const medibles = lavados.filter(esMedible);
  if (medibles.length === 0) return VACIO;

  const esperas: number[] = [];
  const lavadosMin: number[] = [];
  const entregas: number[] = [];
  const totales: number[] = [];

  for (const l of medibles) {
    if (l.inicioMs! >= l.llegadaMs) esperas.push(minutos(l.llegadaMs, l.inicioMs!));
    lavadosMin.push(minutos(l.inicioMs!, l.finMs!));
    if (l.entregadoMs != null && l.entregadoMs >= l.finMs!) {
      entregas.push(minutos(l.finMs!, l.entregadoMs));
      totales.push(minutos(l.llegadaMs, l.entregadoMs));
    }
  }

  return {
    muestra: medibles.length,
    espera: promedio(esperas),
    lavado: promedio(lavadosMin),
    entrega: promedio(entregas),
    total: promedio(totales),
    lavadoMin: lavadosMin.length ? Math.round(Math.min(...lavadosMin)) : null,
    lavadoMax: lavadosMin.length ? Math.round(Math.max(...lavadosMin)) : null,
  };
}

/** Agrupa por una clave y calcula las duraciones de cada grupo. */
export function cortarPor(
  lavados: LavadoMedido[],
  clave: (l: LavadoMedido) => string
): Corte[] {
  const grupos = new Map<string, LavadoMedido[]>();
  for (const l of lavados.filter(esMedible)) {
    const k = clave(l);
    grupos.set(k, [...(grupos.get(k) ?? []), l]);
  }
  return [...grupos.entries()]
    .map(([k, items]) => ({ clave: k, duraciones: calcularDuraciones(items) }))
    .sort((a, b) => (b.duraciones.lavado ?? 0) - (a.duraciones.lavado ?? 0));
}

/** "1 h 25 min", "45 min", "—" */
export function formatMinutos(m: number | null): string {
  if (m == null) return "—";
  if (m < 60) return `${m} min`;
  const horas = Math.floor(m / 60);
  const resto = m % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}
