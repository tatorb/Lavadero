"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Droplets,
  LogOut,
  Menu,
  Settings,
  SprayCan,
  Upload,
  Users,
  Wallet,
  Waves,
} from "lucide-react";

import { cerrarSesion } from "@/server/actions/auth";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV = [
  { href: "/admin/turnos", label: "Turnos", icon: CalendarDays },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/lavados", label: "Lavados", icon: Waves },
  { href: "/admin/caja", label: "Caja", icon: Wallet },
  { href: "/admin/servicios", label: "Servicios", icon: SprayCan },
  { href: "/admin/configuracion/franjas", label: "Franjas horarias", icon: Settings },
  { href: "/admin/configuracion/importaciones", label: "Importaciones", icon: Upload },
];

interface UsuarioInfo {
  nombre: string;
  rol: string;
}

function NavContenido({
  usuario,
  lavaderoNombre,
  onNavegar,
}: {
  usuario: UsuarioInfo;
  lavaderoNombre: string;
  onNavegar?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Droplets className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{lavaderoNombre}</p>
          <p className="text-xs text-muted-foreground">Panel de gestión</p>
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
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium">{usuario.nombre}</p>
          <Badge variant={usuario.rol === "ADMIN" ? "default" : "secondary"}>
            {usuario.rol === "ADMIN" ? "Admin" : "Operativo"}
          </Badge>
        </div>
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

/** Sidebar fija — solo visible en desktop (lg+). */
export function AdminSidebar({
  usuario,
  lavaderoNombre,
}: {
  usuario: UsuarioInfo;
  lavaderoNombre: string;
}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-background lg:flex">
      <NavContenido usuario={usuario} lavaderoNombre={lavaderoNombre} />
    </aside>
  );
}

/** Header sticky con hamburguesa + drawer — solo visible en mobile (< lg). */
export function AdminMobileHeader({
  usuario,
  lavaderoNombre,
}: {
  usuario: UsuarioInfo;
  lavaderoNombre: string;
}) {
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
            usuario={usuario}
            lavaderoNombre={lavaderoNombre}
            onNavegar={() => setAbierto(false)}
          />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Droplets className="h-4 w-4" />
        </div>
        <p className="truncate text-sm font-semibold">{lavaderoNombre}</p>
      </div>
    </header>
  );
}
