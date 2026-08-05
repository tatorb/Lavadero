import { notFound } from "next/navigation";

import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { descripcionAuto } from "@/lib/format";
import { LavadoDetalle } from "./lavado-detalle";

export const metadata = { title: "Lavado — Gestión" };

export default async function LavadoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireStaff();

  const lavado = await prisma.lavado.findFirst({
    where: { id, lavaderoId: user.lavaderoId },
    include: {
      cliente: true,
      auto: true,
      servicio: true,
      turno: true,
      addons: { include: { servicio: true } },
      pagos: true,
    },
  });
  if (!lavado) notFound();

  return (
    <LavadoDetalle
      lavado={{
        id: lavado.id,
        cliente: {
          id: lavado.cliente.id,
          nombre: [lavado.cliente.nombre, lavado.cliente.apellido]
            .filter(Boolean)
            .join(" "),
        },
        auto: descripcionAuto(lavado.auto),
        servicio: lavado.servicio.nombre,
        addons: lavado.addons.map((a) => ({
          nombre: a.servicio.nombre,
          precio: a.precio.toNumber(),
        })),
        llegadaAt: lavado.llegadaAt.toISOString(),
        inicioAt: lavado.inicioAt?.toISOString() ?? null,
        finAt: lavado.finAt?.toISOString() ?? null,
        entregadoAt: lavado.entregadoAt?.toISOString() ?? null,
        canceladoAt: lavado.canceladoAt?.toISOString() ?? null,
        detalles: lavado.detalles,
        precioFinal: lavado.precioFinal?.toNumber() ?? null,
        puntosOtorgados: lavado.puntosOtorgados,
        deTurno: !!lavado.turnoId,
        importeCobrado: lavado.importeCobrado?.toNumber() ?? null,
        estadoPago: lavado.estadoPago,
        formaPago: lavado.formaPago,
        motivoAjuste: lavado.motivoAjuste,
        pagos: lavado.pagos.map((p) => ({
          medio: p.medio,
          importe: p.importe.toNumber(),
        })),
      }}
    />
  );
}
