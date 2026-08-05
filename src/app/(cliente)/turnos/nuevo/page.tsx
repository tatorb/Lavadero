import { requireCliente } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { TIPO_VEHICULO_LABEL } from "@/lib/format";
import { matrizPrecios } from "@/lib/precios";
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
      include: { precios: true },
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
      sublabel: a.patente ?? TIPO_VEHICULO_LABEL[a.tipo],
      tipoVehiculo: a.tipo as string,
    })),
    ...(cliente.vinculadoCon?.autos.map((a) => ({
      id: a.id,
      label: `${a.marca} ${a.modelo}`,
      sublabel: `${a.patente ?? TIPO_VEHICULO_LABEL[a.tipo]} · de ${cliente.vinculadoCon!.nombre}`,
      tipoVehiculo: a.tipo as string,
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
        precios: matrizPrecios(s),
        duracionMin: s.duracionMin,
        puntos: s.puntos,
        tipo: s.tipo,
      }))}
      timezone={lavadero.timezone}
    />
  );
}
