import * as React from "react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Card de métrica: ícono arriba, dato protagonista y etiqueta en versalitas.
 * Misma anatomía en todas las pantallas para que el ojo la reconozca.
 */
export function CardMetrica({
  icono,
  valor,
  etiqueta,
  detalle,
  tono = "neutro",
  className,
}: {
  icono: React.ReactNode;
  valor: React.ReactNode;
  etiqueta: string;
  detalle?: React.ReactNode;
  tono?: "neutro" | "positivo" | "negativo";
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="space-y-2 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary [&_svg]:h-4.5 [&_svg]:w-4.5">
          {icono}
        </div>
        <p
          className={cn(
            "dato-lg pt-0.5",
            tono === "positivo" && "text-emerald-700",
            tono === "negativo" && "text-destructive"
          )}
        >
          {valor}
        </p>
        <p className="etiqueta">{etiqueta}</p>
        {detalle && <p className="text-xs text-muted-foreground">{detalle}</p>}
      </CardContent>
    </Card>
  );
}
