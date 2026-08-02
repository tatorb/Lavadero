export interface NivelInfo {
  id: string;
  nombre: string;
  orden: number;
  puntosMin: number;
  color: string | null;
}

export interface EstadoNivel {
  nivelActual: NivelInfo | null;
  nivelSiguiente: NivelInfo | null;
  /** 0..1 — progreso hacia el siguiente nivel (1 si es el máximo) */
  progreso: number;
  puntosParaSiguiente: number;
}

/**
 * Calcula el nivel actual y el progreso hacia el siguiente a partir de los
 * puntos totales. Los niveles deben pertenecer al mismo lavadero.
 */
export function calcularNivel(puntos: number, niveles: NivelInfo[]): EstadoNivel {
  const ordenados = [...niveles].sort((a, b) => a.puntosMin - b.puntosMin);
  let nivelActual: NivelInfo | null = null;
  let nivelSiguiente: NivelInfo | null = null;

  for (const nivel of ordenados) {
    if (puntos >= nivel.puntosMin) {
      nivelActual = nivel;
    } else {
      nivelSiguiente = nivel;
      break;
    }
  }

  if (!nivelSiguiente) {
    return { nivelActual, nivelSiguiente: null, progreso: 1, puntosParaSiguiente: 0 };
  }

  const base = nivelActual?.puntosMin ?? 0;
  const rango = nivelSiguiente.puntosMin - base;
  const progreso = rango > 0 ? (puntos - base) / rango : 0;

  return {
    nivelActual,
    nivelSiguiente,
    progreso: Math.min(Math.max(progreso, 0), 1),
    puntosParaSiguiente: nivelSiguiente.puntosMin - puntos,
  };
}

/**
 * Nueva racha tras una visita finalizada.
 * - Primera visita → 1
 * - Mismo día calendario (UTC) que la última → se mantiene
 * - Dentro de la ventana → +1
 * - Fuera de la ventana → se reinicia en 1
 */
export function calcularNuevaRacha(
  ultimaVisita: Date | null,
  rachaActual: number,
  visita: Date,
  ventanaDias: number
): number {
  if (!ultimaVisita) return 1;

  const mismoDia = ultimaVisita.toISOString().slice(0, 10) === visita.toISOString().slice(0, 10);
  if (mismoDia) return Math.max(rachaActual, 1);

  const diffDias = (visita.getTime() - ultimaVisita.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDias <= ventanaDias && diffDias > 0) return rachaActual + 1;
  return 1;
}

export const NIVELES_DEFAULT = [
  { nombre: "Bronce", orden: 1, puntosMin: 0, color: "#b45309" },
  { nombre: "Plata", orden: 2, puntosMin: 200, color: "#64748b" },
  { nombre: "Oro", orden: 3, puntosMin: 500, color: "#d97706" },
];
