import Link from "next/link";
import { Building2, Droplets, LogOut, Users } from "lucide-react";

import { requireSuperAdmin } from "@/lib/auth-helpers";
import { cerrarSesion } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const metadata = { title: "Super admin — Lavadero" };

export default async function SuperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSuperAdmin();

  return (
    <div className="flex min-h-screen w-full">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r bg-background">
        <div className="flex items-center gap-2 px-4 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-white">
            <Droplets className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Lavadero</p>
            <p className="text-xs text-muted-foreground">Super admin</p>
          </div>
        </div>
        <Separator />
        <nav className="flex-1 space-y-1 p-3">
          <Link
            href="/super/lavaderos"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Building2 className="h-4 w-4" />
            Lavaderos
          </Link>
          <Link
            href="/super/usuarios"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Users className="h-4 w-4" />
            Usuarios
          </Link>
        </nav>
        <Separator />
        <div className="space-y-2 p-4">
          <p className="truncate text-sm font-medium">{user.nombre}</p>
          <form action={cerrarSesion}>
            <Button variant="outline" size="sm" className="w-full" type="submit">
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 bg-muted/30 p-6 lg:p-8">{children}</main>
    </div>
  );
}
