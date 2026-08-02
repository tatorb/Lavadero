import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { AdminSidebar } from "@/components/admin/sidebar";

export const metadata = { title: "Gestión — Lavadero" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const lavadero = await prisma.lavadero.findUnique({
    where: { id: user.lavaderoId },
    select: { nombre: true },
  });

  return (
    <div className="flex min-h-screen w-full">
      <AdminSidebar
        usuario={{ nombre: user.nombre, rol: user.rol! }}
        lavaderoNombre={lavadero?.nombre ?? "Lavadero"}
      />
      <main className="flex-1 overflow-x-hidden bg-muted/30 p-6 lg:p-8">{children}</main>
    </div>
  );
}
