import { requireCliente } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { NuevoTurnoWizard } from "./wizard";

export const metadata = { title: "Pedir turno" };

export default async function NuevoTurnoPage() {
  const user = await requireCliente();

  const [cliente, servicios, lavadero] = await Promise.all([
    prisma.cliente.findUniqueOrThrow({
      where: { id: user.id },
      include: {
        autos: { where: { activo: true } },
        vinculadoCon: {
          select: { nombre: true, autos: { where: { activo: true } } },
        },
      },
    }),
    prisma.servicio.findMany({
      where: { lavaderoId: user.lavaderoId, activo: true },
      orderBy: { orden: "asc" },
    }),
    prisma.lavadero.findUniqueOrThrow({
      where: { id: user.lavaderoId },
      select: { timezone: true },
    }),
  ]);

  const autos = [
    ...cliente.autos.map((a) => ({
      id: a.id,
      label: `${a.marca} ${a.modelo}`,
      sublabel: a.patente,
    })),
    ...(cliente.vinculadoCon?.autos.map((a) => ({
      id: a.id,
      label: `${a.marca} ${a.modelo}`,
      sublabel: `${a.patente} · de ${cliente.vinculadoCon!.nombre}`,
    })) ?? []),
  ];

  return (
    <NuevoTurnoWizard
      autos={autos}
      servicios={servicios.map((s) => ({
        id: s.id,
        nombre: s.nombre,
        descripcion: s.descripcion,
        precio: s.precio.toNumber(),
        duracionMin: s.duracionMin,
        puntos: s.puntos,
        tipo: s.tipo,
      }))}
      timezone={lavadero.timezone}
    />
  );
}
