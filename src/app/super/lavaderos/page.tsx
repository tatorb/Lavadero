import { requireSuperAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { LavaderosTable } from "./lavaderos-table";

export const metadata = { title: "Lavaderos — Super admin" };

export default async function LavaderosPage() {
  await requireSuperAdmin();
  const lavaderos = await prisma.lavadero.findMany({
    include: {
      _count: { select: { clientes: true, usuarios: true, lavados: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lavaderos</h1>
        <p className="text-sm text-muted-foreground">
          Todos los lavaderos de la plataforma
        </p>
      </div>
      <LavaderosTable
        lavaderos={lavaderos.map((l) => ({
          id: l.id,
          nombre: l.nombre,
          slug: l.slug,
          direccion: l.direccion,
          telefono: l.telefono,
          activo: l.activo,
          clientes: l._count.clientes,
          usuarios: l._count.usuarios,
          lavados: l._count.lavados,
        }))}
      />
    </div>
  );
}
