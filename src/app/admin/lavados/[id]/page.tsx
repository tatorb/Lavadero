import { notFound } from "next/navigation";

import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
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
        auto: `${lavado.auto.marca} ${lavado.auto.modelo} (${lavado.auto.patente})`,
        servicio: lavado.servicio.nombre,
        addons: lavado.addons.map((a) => ({
          nombre: a.servicio.nombre,
          precio: a.precio.toNumber(),
        })),
        llegadaAt: lavado.llegadaAt.toISOString(),
        inicioAt: lavado.inicioAt?.toISOString() ?? null,
        finAt: lavado.finAt?.toISOString() ?? null,
        detalles: lavado.detalles,
        precioFinal: lavado.precioFinal?.toNumber() ?? null,
        puntosOtorgados: lavado.puntosOtorgados,
        deTurno: !!lavado.turnoId,
      }}
    />
  );
}
