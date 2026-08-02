export type EstadoTurno = "PENDIENTE" | "CONFIRMADO" | "CANCELADO" | "COMPLETADO";

export const ESTADO_TURNO_BADGE: Record<
  EstadoTurno,
  { label: string; variant: "warning" | "success" | "muted" | "info" }
> = {
  PENDIENTE: { label: "Pendiente", variant: "warning" },
  CONFIRMADO: { label: "Confirmado", variant: "success" },
  CANCELADO: { label: "Cancelado", variant: "muted" },
  COMPLETADO: { label: "Completado", variant: "info" },
};

/** Colores de tarjeta para el calendario (fondo, borde, texto). */
export const ESTADO_TURNO_CARD: Record<EstadoTurno, string> = {
  PENDIENTE: "bg-amber-100 border-amber-400 text-amber-900",
  CONFIRMADO: "bg-emerald-100 border-emerald-500 text-emerald-900",
  CANCELADO: "bg-neutral-100 border-neutral-300 text-neutral-500 line-through",
  COMPLETADO: "bg-sky-100 border-sky-400 text-sky-900",
};
