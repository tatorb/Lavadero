import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { ServiciosTable } from "./servicios-table";

export const metadata = { title: "Servicios — Gestión" };

export default async function ServiciosPage() {
  const user = await requireStaff();
  const servicios = await prisma.servicio.findMany({
    where: { lavaderoId: user.lavaderoId },
    include: { precios: true },
    orderBy: [{ tipo: "asc" }, { orden: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Servicios</h1>
        <p className="text-sm text-muted-foreground">
          Lavados y adicionales que ofrece el lavadero
        </p>
      </div>
      <ServiciosTable
        servicios={servicios.map((s) => ({
          id: s.id,
          nombre: s.nombre,
          descripcion: s.descripcion,
          precio: s.precio.toNumber(),
          precios: Object.fromEntries(
            s.precios.map((p) => [p.tipoVehiculo, p.precio.toNumber()])
          ),
          tipo: s.tipo,
          duracionMin: s.duracionMin,
          puntos: s.puntos,
          activo: s.activo,
        }))}
        puedeEditar={user.rol === "ADMIN"}
      />
    </div>
  );
}
