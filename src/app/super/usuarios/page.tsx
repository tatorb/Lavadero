import { requireSuperAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { UsuariosTable } from "./usuarios-table";

export const metadata = { title: "Usuarios — Super admin" };

export default async function UsuariosPage() {
  const actual = await requireSuperAdmin();
  const [usuarios, lavaderos] = await Promise.all([
    prisma.usuario.findMany({
      include: { lavadero: { select: { nombre: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.lavadero.findMany({
      where: { activo: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <p className="text-sm text-muted-foreground">
          Personal de todos los lavaderos y super admins
        </p>
      </div>
      <UsuariosTable
        usuarios={usuarios.map((u) => ({
          id: u.id,
          nombre: u.nombre,
          email: u.email,
          rol: u.rol,
          lavadero: u.lavadero?.nombre ?? null,
          activo: u.activo,
          esYo: u.id === actual.id,
        }))}
        lavaderos={lavaderos}
      />
    </div>
  );
}
