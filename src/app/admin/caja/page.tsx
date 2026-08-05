import { endOfMonth, format, startOfMonth } from "date-fns";
import { toZonedTime } from "date-fns-tz";

import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { CajaContenido } from "./caja-contenido";

export const metadata = { title: "Caja — Gestión" };

export default async function CajaPage() {
  const user = await requireStaff();
  const lavadero = await prisma.lavadero.findUniqueOrThrow({
    where: { id: user.lavaderoId },
    select: { timezone: true },
  });

  const ahoraLocal = toZonedTime(new Date(), lavadero.timezone);
  const inicioMes = startOfMonth(ahoraLocal);
  const finMes = endOfMonth(ahoraLocal);

  const [movimientos, lavadosMes] = await Promise.all([
    prisma.movimientoCaja.findMany({
      where: { lavaderoId: user.lavaderoId },
      orderBy: { fecha: "desc" },
      take: 300,
    }),
    prisma.lavado.aggregate({
      where: {
        lavaderoId: user.lavaderoId,
        llegadaAt: { gte: inicioMes, lte: finMes },
        canceladoAt: null,
        importeCobrado: { not: null },
      },
      _sum: { importeCobrado: true },
      _count: true,
    }),
  ]);

  const movsMes = movimientos.filter(
    (m) => m.fecha >= inicioMes && m.fecha <= finMes
  );
  const ingresosExtra = movsMes
    .filter((m) => m.tipo === "INGRESO")
    .reduce((s, m) => s + m.importe.toNumber(), 0);
  const egresos = movsMes
    .filter((m) => m.tipo === "EGRESO")
    .reduce((s, m) => s + m.importe.toNumber(), 0);
  const ingresosLavados = lavadosMes._sum.importeCobrado?.toNumber() ?? 0;

  return (
    <CajaContenido
      mesLabel={format(ahoraLocal, "MM/yyyy")}
      resumen={{
        ingresosLavados,
        cantidadLavados: lavadosMes._count,
        ingresosExtra,
        egresos,
        neto: ingresosLavados + ingresosExtra - egresos,
      }}
      movimientos={movimientos.map((m) => ({
        id: m.id,
        fecha: m.fecha.toISOString(),
        tipo: m.tipo,
        categoria: m.categoria,
        concepto: m.concepto,
        importe: m.importe.toNumber(),
        formaPago: m.formaPago,
        observaciones: m.observaciones,
        importado: !!m.importBatchId,
      }))}
      puedeEliminar={user.rol === "ADMIN"}
    />
  );
}
