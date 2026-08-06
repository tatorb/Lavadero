"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Droplets, LogOut, Menu, Users } from "lucide-react";

import { cerrarSesion } from "@/server/actions/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV = [
  { href: "/super/lavaderos", label: "Lavaderos", icon: Building2 },
  { href: "/super/usuarios", label: "Usuarios", icon: Users },
];

function NavContenido({
  nombreUsuario,
  onNavegar,
}: {
  nombreUsuario: string;
  onNavegar?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
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
        {NAV.map((item) => {
          const activo = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavegar}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors active:bg-accent active:text-foreground",
                activo
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Separator />
      <div className="space-y-2 p-4">
        <p className="truncate text-sm font-medium">{nombreUsuario}</p>
        <form action={cerrarSesion}>
          <Button variant="outline" size="sm" className="w-full" type="submit">
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </form>
      </div>
    </>
  );
}

export function SuperSidebar({ nombreUsuario }: { nombreUsuario: string }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-background lg:flex">
      <NavContenido nombreUsuario={nombreUsuario} />
    </aside>
  );
}

export function SuperMobileHeader({ nombreUsuario }: { nombreUsuario: string }) {
  const [abierto, setAbierto] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
      <Sheet open={abierto} onOpenChange={setAbierto}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Abrir menú">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
          <NavContenido
            nombreUsuario={nombreUsuario}
            onNavegar={() => setAbierto(false)}
          />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white">
          <Droplets className="h-4 w-4" />
        </div>
        <p className="truncate text-sm font-semibold">Super admin</p>
      </div>
    </header>
  );
}
