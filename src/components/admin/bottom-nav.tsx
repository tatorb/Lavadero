"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutGrid, Menu, Plus, Users } from "lucide-react";

import { cn } from "@/lib/utils";

const IZQUIERDA = [
  { href: "/admin", label: "Inicio", icon: LayoutGrid, exacto: true },
  { href: "/admin/turnos", label: "Turnos", icon: CalendarDays },
];

const DERECHA = [{ href: "/admin/clientes", label: "Clientes", icon: Users }];

function Tab({
  href,
  label,
  icon: Icon,
  activo,
  badge,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  activo: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex flex-col items-center gap-0.5 py-2 text-[0.6875rem] transition-[transform,color] duration-100 active:scale-90",
        activo ? "text-primary" : "text-muted-foreground"
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
      {badge != null && badge > 0 && (
        <span className="absolute right-1/2 top-1 flex h-4 min-w-4 translate-x-3.5 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-semibold text-primary-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}

/**
 * Barra inferior del panel en el celular, con el botón de nuevo lavado
 * elevado en el centro. Registrar la llegada es lo que más se hace en el
 * mostrador, así que es lo único que está siempre a un toque del pulgar.
 *
 * El resto de las secciones vive detrás de "Más", que abre el mismo drawer
 * que ya usaba el header.
 */
export function AdminBottomNav({
  pendientes,
  onAbrirMenu,
}: {
  pendientes: number;
  onAbrirMenu: () => void;
}) {
  const pathname = usePathname();
  const esActivo = (href: string, exacto?: boolean) =>
    exacto ? pathname === href : pathname.startsWith(href);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="grid grid-cols-5 items-end">
        {IZQUIERDA.map((item) => (
          <Tab
            key={item.href}
            {...item}
            activo={esActivo(item.href, item.exacto)}
            badge={item.href === "/admin/turnos" ? pendientes : undefined}
          />
        ))}

        {/* Botón central: sobresale de la barra para que se lea como la acción principal */}
        <div className="flex justify-center">
          <Link
            href="/admin/nuevo"
            aria-label="Registrar llegada"
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-halo ring-4 ring-background transition-transform duration-100 active:scale-90"
          >
            <Plus className="h-7 w-7" />
          </Link>
        </div>

        {DERECHA.map((item) => (
          <Tab key={item.href} {...item} activo={esActivo(item.href)} />
        ))}

        <button
          type="button"
          onClick={onAbrirMenu}
          className="flex flex-col items-center gap-0.5 py-2 text-[0.6875rem] text-muted-foreground transition-transform duration-100 active:scale-90"
        >
          <Menu className="h-5 w-5" />
          Más
        </button>
      </div>
    </nav>
  );
}
