"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Droplets,
  LogOut,
  Settings,
  SprayCan,
  Users,
  Waves,
} from "lucide-react";

import { cerrarSesion } from "@/server/actions/auth";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const NAV = [
  { href: "/admin/turnos", label: "Turnos", icon: CalendarDays },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/lavados", label: "Lavados", icon: Waves },
  { href: "/admin/servicios", label: "Servicios", icon: SprayCan },
  { href: "/admin/configuracion/franjas", label: "Franjas horarias", icon: Settings },
];

export function AdminSidebar({
  usuario,
  lavaderoNombre,
}: {
  usuario: { nombre: string; rol: string };
  lavaderoNombre: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r bg-background">
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
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
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
    </aside>
  );
}
