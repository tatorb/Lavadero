import * as React from "react";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Vacío como componente accionable: en vez de un texto gris muerto, una
 * tarjeta punteada que invita a crear el primer registro.
 */
export function EstadoVacio({
  titulo,
  descripcion,
  icono,
  accion,
  className,
}: {
  titulo: string;
  descripcion?: string;
  icono?: React.ReactNode;
  accion?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-6 py-10 text-center",
        className
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icono ?? <Plus className="h-5 w-5" />}
      </div>
      <p className="font-medium">{titulo}</p>
      {descripcion && (
        <p className="max-w-xs text-sm text-muted-foreground">{descripcion}</p>
      )}
      {accion && <div className="pt-1">{accion}</div>}
    </div>
  );
}
