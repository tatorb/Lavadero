import type { Prisma } from "@prisma/client";

import { calcularNuevaRacha } from "./niveles";

/**
 * Reconstruye la caché de gamificación de un cliente (`puntosTotal`,
 * `rachaActual`, `mejorRacha`, `ultimaVisita`) a partir del ledger y de los
 * lavados finalizados.
 *
 * `otorgarPuntosLavado` mantiene esa caché de forma incremental, pero después
 * de una fusión el cliente hereda movimientos y lavados de otro y la única
 * forma correcta de resolverla es recorrer el historial completo en orden.
 * Debe ejecutarse dentro de una transacción.
 */
export async function recalcularGamificacion(
  tx: Prisma.TransactionClient,
  clienteId: string
) {
  const cliente = await tx.cliente.findUniqueOrThrow({
    where: { id: clienteId },
    select: { lavadero: { select: { rachaVentanaDias: true } } },
  });

  const [suma, lavados] = await Promise.all([
    tx.puntosMovimiento.aggregate({ where: { clienteId }, _sum: { puntos: true } }),
    tx.lavado.findMany({
      where: { clienteId, finAt: { not: null } },
      select: { finAt: true },
      orderBy: { finAt: "asc" },
    }),
  ]);

  let rachaActual = 0;
  let mejorRacha = 0;
  let ultimaVisita: Date | null = null;

  for (const lavado of lavados) {
    const fin = lavado.finAt!;
    rachaActual = calcularNuevaRacha(
      ultimaVisita,
      rachaActual,
      fin,
      cliente.lavadero.rachaVentanaDias
    );
    mejorRacha = Math.max(mejorRacha, rachaActual);
    ultimaVisita = fin;
  }

  await tx.cliente.update({
    where: { id: clienteId },
    data: {
      puntosTotal: suma._sum.puntos ?? 0,
      rachaActual,
      mejorRacha,
      ultimaVisita,
    },
  });

  return { puntosTotal: suma._sum.puntos ?? 0, rachaActual, mejorRacha, ultimaVisita };
}
