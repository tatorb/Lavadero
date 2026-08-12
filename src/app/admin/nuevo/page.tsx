import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { descripcionAuto } from "@/lib/format";
import { NuevoLavadoFlujo, type ClienteFlujo, type ServicioFlujo } from "./nuevo-lavado-flujo";

export const metadata = { title: "Registrar llegada — Gestión" };

export default async function NuevoLavadoPage() {
  const user = await requireStaff();

  const [clientes, servicios] = await Promise.all([
    prisma.cliente.findMany({
      where: { lavaderoId: user.lavaderoId, activo: true },
      include: {
        autos: { where: { activo: true } },
        vinculadoCon: {
          select: {
            nombre: true,
            apellido: true,
            autos: { where: { activo: true } },
          },
        },
      },
      orderBy: { nombre: "asc" },
    }),
    prisma.servicio.findMany({
      where: { lavaderoId: user.lavaderoId, activo: true },
      include: { precios: true },
      orderBy: { orden: "asc" },
    }),
  ]);

  const items: ClienteFlujo[] = clientes.map((c) => ({
    id: c.id,
    nombre: [c.nombre, c.apellido].filter(Boolean).join(" "),
    telefono: c.telefono,
    email: c.email,
    autos: [
      ...c.autos.map((a) => ({
        id: a.id,
        label: descripcionAuto(a),
        tipoVehiculo: a.tipo,
        deVinculado: null as string | null,
      })),
      ...(c.vinculadoCon?.autos ?? []).map((a) => ({
        id: a.id,
        label: descripcionAuto(a),
        tipoVehiculo: a.tipo,
        deVinculado: [c.vinculadoCon!.nombre, c.vinculadoCon!.apellido]
          .filter(Boolean)
          .join(" "),
      })),
    ],
  }));

  const catalogo: ServicioFlujo[] = servicios.map((s) => ({
    id: s.id,
    nombre: s.nombre,
    tipo: s.tipo,
    precio: s.precio.toNumber(),
    precios: Object.fromEntries(s.precios.map((p) => [p.tipoVehiculo, p.precio.toNumber()])),
  }));

  return <NuevoLavadoFlujo clientes={items} servicios={catalogo} />;
}
