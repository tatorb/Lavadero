import type { Prisma } from "@prisma/client";

import { calcularNuevaRacha } from "./niveles";

/**
 * Otorga los puntos de un lavado finalizado y actualiza la racha del cliente.
 * Debe ejecutarse dentro de una transacción. Es idempotente: si el lavado ya
 * otorgó puntos no vuelve a hacerlo.
 */
export async function otorgarPuntosLavado(
  tx: Prisma.TransactionClient,
  lavadoId: string,
  finAt: Date
) {
  const lavado = await tx.lavado.findUniqueOrThrow({
    where: { id: lavadoId },
    include: {
      servicio: true,
      addons: { include: { servicio: true } },
      cliente: true,
      lavadero: { select: { rachaVentanaDias: true } },
    },
  });

  if (lavado.puntosOtorgados > 0) return lavado.puntosOtorgados;

  const puntos =
    lavado.servicio.puntos +
    lavado.addons.reduce((sum, a) => sum + a.servicio.puntos, 0);

  const nuevaRacha = calcularNuevaRacha(
    lavado.cliente.ultimaVisita,
    lavado.cliente.rachaActual,
    finAt,
    lavado.lavadero.rachaVentanaDias
  );

  await tx.puntosMovimiento.create({
    data: {
      lavaderoId: lavado.lavaderoId,
      clienteId: lavado.clienteId,
      lavadoId: lavado.id,
      tipo: "LAVADO",
      puntos,
      descripcion: `Lavado: ${lavado.servicio.nombre}`,
    },
  });

  await tx.cliente.update({
    where: { id: lavado.clienteId },
    data: {
      puntosTotal: { increment: puntos },
      rachaActual: nuevaRacha,
      mejorRacha: Math.max(lavado.cliente.mejorRacha, nuevaRacha),
      ultimaVisita: finAt,
    },
  });

  await tx.lavado.update({
    where: { id: lavado.id },
    data: { puntosOtorgados: puntos, finAt },
  });

  return puntos;
}
