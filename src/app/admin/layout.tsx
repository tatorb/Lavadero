import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { AdminMobileHeader, AdminSidebar } from "@/components/admin/sidebar";

export const metadata = { title: "Gestión — Lavadero" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const lavadero = await prisma.lavadero.findUnique({
    where: { id: user.lavaderoId },
    select: { nombre: true },
  });

  const usuario = { nombre: user.nombre, rol: user.rol! };
  const nombre = lavadero?.nombre ?? "Lavadero";

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      <AdminSidebar usuario={usuario} lavaderoNombre={nombre} />
      <AdminMobileHeader usuario={usuario} lavaderoNombre={nombre} />
      <main className="flex-1 overflow-x-hidden bg-muted/30 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
