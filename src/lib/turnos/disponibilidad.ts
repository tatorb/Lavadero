import "server-only";

import { prisma } from "@/lib/db";
import { fromZonedTime } from "date-fns-tz";

import { generarSlotsDia, type SlotDisponibilidad } from "./reglas";

/**
 * Slots de un día (yyyy-MM-dd en la TZ del lavadero) con su disponibilidad
 * real según reglas y turnos ya tomados.
 */
export async function getSlotsDia(
  lavaderoId: string,
  dia: string,
  ahora = new Date()
): Promise<SlotDisponibilidad[]> {
  const lavadero = await prisma.lavadero.findUniqueOrThrow({
    where: { id: lavaderoId },
    select: { timezone: true },
  });

  const reglas = await prisma.reglaFranja.findMany({
    where: { lavaderoId, activo: true },
  });

  const inicioDia = fromZonedTime(`${dia}T00:00:00`, lavadero.timezone);
  const finDia = fromZonedTime(`${dia}T23:59:59`, lavadero.timezone);

  const turnos = await prisma.turno.groupBy({
    by: ["fechaTurno"],
    where: {
      lavaderoId,
      fechaTurno: { gte: inicioDia, lte: finDia },
      estado: { in: ["PENDIENTE", "CONFIRMADO"] },
    },
    _count: true,
  });

  const ocupadosPorSlot = new Map(
    turnos.map((t) => [t.fechaTurno.toISOString(), t._count])
  );

  return generarSlotsDia(reglas, dia, lavadero.timezone, ahora, ocupadosPorSlot);
}
