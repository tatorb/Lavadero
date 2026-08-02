import { addDays, format, startOfWeek } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { CalendarioTurnos, type Vista } from "@/components/calendario/calendario-turnos";

export const metadata = { title: "Turnos — Gestión" };

export default async function TurnosPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; fecha?: string }>;
}) {
  const params = await searchParams;
  const user = await requireStaff();

  const lavadero = await prisma.lavadero.findUniqueOrThrow({
    where: { id: user.lavaderoId },
    select: { timezone: true },
  });
  const tz = lavadero.timezone;

  const vista: Vista = ["dia", "semana", "mes"].includes(params.vista ?? "")
    ? (params.vista as Vista)
    : "semana";
  const hoyLocal = format(toZonedTime(new Date(), tz), "yyyy-MM-dd");
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(params.fecha ?? "") ? params.fecha! : hoyLocal;

  // Rango visible (en la TZ del lavadero) — el mes incluye las semanas de borde
  const base = new Date(`${fecha}T12:00:00`);
  let desdeLocal: Date;
  let hastaLocal: Date;
  if (vista === "dia") {
    desdeLocal = base;
    hastaLocal = addDays(base, 1);
  } else if (vista === "semana") {
    desdeLocal = startOfWeek(base, { weekStartsOn: 1 });
    hastaLocal = addDays(desdeLocal, 7);
  } else {
    const inicioMes = new Date(base.getFullYear(), base.getMonth(), 1, 12);
    const finMes = new Date(base.getFullYear(), base.getMonth() + 1, 0, 12);
    desdeLocal = startOfWeek(inicioMes, { weekStartsOn: 1 });
    hastaLocal = addDays(startOfWeek(finMes, { weekStartsOn: 1 }), 7);
  }
  const desde = fromZonedTime(`${format(desdeLocal, "yyyy-MM-dd")}T00:00:00`, tz);
  const hasta = fromZonedTime(`${format(hastaLocal, "yyyy-MM-dd")}T00:00:00`, tz);

  const [turnos, clientes, servicios] = await Promise.all([
    prisma.turno.findMany({
      where: { lavaderoId: user.lavaderoId, fechaTurno: { gte: desde, lt: hasta } },
      include: {
        cliente: true,
        auto: true,
        servicio: true,
        addons: { include: { servicio: true } },
        lavado: { select: { id: true } },
      },
      orderBy: { fechaTurno: "asc" },
    }),
    prisma.cliente.findMany({
      where: { lavaderoId: user.lavaderoId, activo: true },
      include: {
        autos: { where: { activo: true } },
        vinculadoCon: { include: { autos: { where: { activo: true } } } },
      },
      orderBy: { nombre: "asc" },
    }),
    prisma.servicio.findMany({
      where: { lavaderoId: user.lavaderoId, activo: true },
      orderBy: { orden: "asc" },
    }),
  ]);

  return (
    <CalendarioTurnos
      vista={vista}
      fecha={fecha}
      hoy={hoyLocal}
      timezone={tz}
      turnos={turnos.map((t) => ({
        id: t.id,
        fecha: t.fechaTurno.toISOString(),
        duracionMin: t.duracionMin,
        estado: t.estado,
        origen: t.origen,
        detalle: t.detalle,
        canceladoMotivo: t.canceladoMotivo,
        conLavado: !!t.lavado,
        cliente: {
          id: t.cliente.id,
          nombre: [t.cliente.nombre, t.cliente.apellido].filter(Boolean).join(" "),
          telefono: t.cliente.telefono,
        },
        auto: t.auto ? `${t.auto.marca} ${t.auto.modelo} (${t.auto.patente})` : null,
        servicio: t.servicio.nombre,
        addons: t.addons.map((a) => a.servicio.nombre),
      }))}
      clientes={clientes.map((c) => ({
        id: c.id,
        nombre: [c.nombre, c.apellido].filter(Boolean).join(" "),
        autos: [
          ...c.autos.map((a) => ({
            id: a.id,
            label: `${a.marca} ${a.modelo} (${a.patente})`,
          })),
          ...(c.vinculadoCon?.autos.map((a) => ({
            id: a.id,
            label: `${a.marca} ${a.modelo} (${a.patente}) — de ${c.vinculadoCon!.nombre}`,
          })) ?? []),
        ],
      }))}
      servicios={servicios.map((s) => ({
        id: s.id,
        nombre: s.nombre,
        precio: s.precio.toNumber(),
        tipo: s.tipo,
      }))}
    />
  );
}
