import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { descripcionAuto } from "@/lib/format";
import { Tablero, type LavadoEnCurso } from "./tablero";

export const metadata = { title: "Inicio — Gestión" };

/**
 * Home del panel: el tablero de lo que está pasando ahora en el lavadero.
 * Un lavado entra cuando llega el auto y sale cuando se entrega cobrado.
 */
export default async function AdminHome() {
  const user = await requireStaff();
  const ahoraISO = new Date().toISOString();

  const [lavados, lavadero] = await Promise.all([
    prisma.lavado.findMany({
      where: {
        lavaderoId: user.lavaderoId,
        canceladoAt: null,
        entregadoAt: null,
      },
      include: {
        cliente: { select: { id: true, nombre: true, apellido: true, telefono: true } },
        auto: true,
        servicio: { select: { nombre: true } },
        addons: { include: { servicio: { select: { nombre: true } } } },
      },
      orderBy: { llegadaAt: "asc" },
    }),
    prisma.lavadero.findUnique({
      where: { id: user.lavaderoId },
      select: { timezone: true },
    }),
  ]);

  const items: LavadoEnCurso[] = lavados.map((l) => ({
    id: l.id,
    cliente: [l.cliente.nombre, l.cliente.apellido].filter(Boolean).join(" "),
    clienteId: l.cliente.id,
    telefono: l.cliente.telefono,
    auto: descripcionAuto(l.auto),
    patente: l.auto.patente,
    servicio: l.servicio.nombre,
    addons: l.addons.map((a) => a.servicio.nombre),
    precioLista: l.precioFinal?.toNumber() ?? null,
    llegadaISO: l.llegadaAt.toISOString(),
    inicioISO: l.inicioAt?.toISOString() ?? null,
    finISO: l.finAt?.toISOString() ?? null,
  }));

  return (
    <Tablero
      lavados={items}
      timezone={lavadero?.timezone ?? "America/Argentina/Buenos_Aires"}
      ahoraISO={ahoraISO}
    />
  );
}
