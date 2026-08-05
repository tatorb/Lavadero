import type { TipoVehiculo } from "@prisma/client";

export interface ServicioConPrecios {
  precio: number | { toNumber(): number };
  precios?: Array<{ tipoVehiculo: TipoVehiculo; precio: number | { toNumber(): number } }>;
}

function aNumero(v: number | { toNumber(): number }): number {
  return typeof v === "number" ? v : v.toNumber();
}

/**
 * Precio de un servicio para un tipo de vehículo: usa el precio específico
 * del tipo si existe, si no el precio base del servicio.
 */
export function precioParaTipo(
  servicio: ServicioConPrecios,
  tipo: TipoVehiculo | null | undefined
): number {
  if (tipo && servicio.precios) {
    const especifico = servicio.precios.find((p) => p.tipoVehiculo === tipo);
    if (especifico) return aNumero(especifico.precio);
  }
  return aNumero(servicio.precio);
}

/** Serializa la matriz de precios para pasarla a componentes cliente. */
export function matrizPrecios(
  servicio: ServicioConPrecios
): Partial<Record<TipoVehiculo, number>> {
  const matriz: Partial<Record<TipoVehiculo, number>> = {};
  for (const p of servicio.precios ?? []) {
    matriz[p.tipoVehiculo] = aNumero(p.precio);
  }
  return matriz;
}
