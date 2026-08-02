import { notFound } from "next/navigation";

import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { calcularNivel } from "@/lib/gamificacion/niveles";
import { ClienteDetalle } from "./cliente-detalle";

export const metadata = { title: "Cliente — Gestión" };

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireStaff();

  const cliente = await prisma.cliente.findFirst({
    where: { id, lavaderoId: user.lavaderoId },
    include: {
      autos: { orderBy: { createdAt: "asc" } },
      vinculadoCon: { select: { id: true, nombre: true, apellido: true } },
      lavados: {
        include: { servicio: true, auto: true },
        orderBy: { llegadaAt: "desc" },
        take: 50,
      },
      turnos: {
        include: { servicio: true, auto: true },
        orderBy: { fechaTurno: "desc" },
        take: 50,
      },
    },
  });
  if (!cliente) notFound();

  const [niveles, candidatos] = await Promise.all([
    prisma.nivel.findMany({
      where: { lavaderoId: user.lavaderoId, activo: true },
      orderBy: { puntosMin: "asc" },
    }),
    prisma.cliente.findMany({
      where: {
        lavaderoId: user.lavaderoId,
        id: { not: cliente.id },
        vinculadoConId: null,
        activo: true,
      },
      select: { id: true, nombre: true, apellido: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const estadoNivel = calcularNivel(cliente.puntosTotal, niveles);

  return (
    <ClienteDetalle
      cliente={{
        id: cliente.id,
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        telefono: cliente.telefono,
        email: cliente.email,
        detalles: cliente.detalles,
        conCuenta: !!cliente.passwordHash,
        puntosTotal: cliente.puntosTotal,
        rachaActual: cliente.rachaActual,
        mejorRacha: cliente.mejorRacha,
        ultimaVisita: cliente.ultimaVisita?.toISOString() ?? null,
        vinculadoCon: cliente.vinculadoCon
          ? {
              id: cliente.vinculadoCon.id,
              nombre: [cliente.vinculadoCon.nombre, cliente.vinculadoCon.apellido]
                .filter(Boolean)
                .join(" "),
            }
          : null,
      }}
      autos={cliente.autos.map((a) => ({
        id: a.id,
        marca: a.marca,
        modelo: a.modelo,
        patente: a.patente,
        color: a.color,
        detalles: a.detalles,
      }))}
      lavados={cliente.lavados.map((l) => ({
        id: l.id,
        fecha: l.llegadaAt.toISOString(),
        servicio: l.servicio.nombre,
        auto: `${l.auto.marca} ${l.auto.modelo} (${l.auto.patente})`,
        finalizado: !!l.finAt,
        puntos: l.puntosOtorgados,
        precio: l.precioFinal?.toNumber() ?? null,
      }))}
      turnos={cliente.turnos.map((t) => ({
        id: t.id,
        fecha: t.fechaTurno.toISOString(),
        servicio: t.servicio.nombre,
        auto: t.auto ? `${t.auto.marca} ${t.auto.modelo}` : null,
        estado: t.estado,
      }))}
      nivel={{
        actual: estadoNivel.nivelActual?.nombre ?? "—",
        color: estadoNivel.nivelActual?.color ?? null,
        siguiente: estadoNivel.nivelSiguiente?.nombre ?? null,
        progreso: estadoNivel.progreso,
        puntosParaSiguiente: estadoNivel.puntosParaSiguiente,
      }}
      candidatosVinculo={candidatos.map((c) => ({
        id: c.id,
        nombre: [c.nombre, c.apellido].filter(Boolean).join(" "),
      }))}
    />
  );
}
