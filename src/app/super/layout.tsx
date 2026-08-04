import { requireSuperAdmin } from "@/lib/auth-helpers";
import { SuperMobileHeader, SuperSidebar } from "@/components/super/nav";

export const metadata = { title: "Super admin — Lavadero" };

export default async function SuperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSuperAdmin();

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      <SuperSidebar nombreUsuario={user.nombre} />
      <SuperMobileHeader nombreUsuario={user.nombre} />
      <main className="flex-1 overflow-x-hidden bg-muted/30 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
