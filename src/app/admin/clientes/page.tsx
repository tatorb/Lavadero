import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { ClientesTable } from "./clientes-table";

export const metadata = { title: "Clientes — Gestión" };

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ archivados?: string }>;
}) {
  const user = await requireStaff();
  const { archivados } = await searchParams;
  const verArchivados = archivados === "1";

  const clientes = await prisma.cliente.findMany({
    where: { lavaderoId: user.lavaderoId, ...(verArchivados ? {} : { activo: true }) },
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
        verArchivados={verArchivados}
        clientes={clientes.map((c) => ({
          id: c.id,
          nombre: [c.nombre, c.apellido].filter(Boolean).join(" "),
          telefono: c.telefono,
          email: c.email,
          autos: c.autos.length,
          lavados: c._count.lavados,
          puntos: c.puntosTotal,
          conCuenta: !!c.passwordHash,
          activo: c.activo,
        }))}
      />
    </div>
  );
}
