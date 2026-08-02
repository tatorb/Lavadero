import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { ClientesTable } from "./clientes-table";

export const metadata = { title: "Clientes — Gestión" };

export default async function ClientesPage() {
  const user = await requireStaff();
  const clientes = await prisma.cliente.findMany({
    where: { lavaderoId: user.lavaderoId },
    include: {
      autos: { where: { activo: true }, select: { id: true } },
      _count: { select: { lavados: true } },
    },
    orderBy: [{ nombre: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clientes</h1>
        <p className="text-sm text-muted-foreground">
          Todos los clientes del lavadero
        </p>
      </div>
      <ClientesTable
        clientes={clientes.map((c) => ({
          id: c.id,
          nombre: [c.nombre, c.apellido].filter(Boolean).join(" "),
          telefono: c.telefono,
          email: c.email,
          autos: c.autos.length,
          lavados: c._count.lavados,
          puntos: c.puntosTotal,
          conCuenta: !!c.passwordHash,
        }))}
      />
    </div>
  );
}
