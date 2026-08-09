"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, XCircle } from "lucide-react";
import { toast } from "sonner";

import { formatFecha } from "@/lib/format";
import { cancelarTurnoCliente } from "@/server/actions/turnos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ESTADO_TURNO_BADGE, type EstadoTurno } from "@/components/turnos/estado";

interface TurnoItem {
  id: string;
  fecha: string;
  servicio: string;
  auto: string | null;
  estado: EstadoTurno;
  futuro: boolean;
}

export function MisTurnos({
  turnos,
  timezone,
}: {
  turnos: TurnoItem[];
  timezone: string;
}) {
  const router = useRouter();
  const [pendiente, setPendiente] = React.useState<string | null>(null);

  return (
    <div className="space-y-3">
      {turnos.map((t) => {
        const badge = ESTADO_TURNO_BADGE[t.estado];
        const cancelable =
          t.futuro && (t.estado === "PENDIENTE" || t.estado === "CONFIRMADO");
        return (
          <Card key={t.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium first-letter:uppercase">
                      {formatFecha(new Date(t.fecha), "EEEE d/MM · HH:mm", timezone)} hs
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.servicio}
                      {t.auto ? ` · ${t.auto}` : ""}
                    </p>
                  </div>
                </div>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
              {t.estado === "PENDIENTE" && t.futuro && (
                <p className="text-xs text-muted-foreground">
                  El lavadero todavía tiene que confirmar este turno.
                </p>
              )}
              {cancelable && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  disabled={pendiente === t.id}
                  onClick={async () => {
                    setPendiente(t.id);
                    const r = await cancelarTurnoCliente(t.id);
                    setPendiente(null);
                    if (r?.error) toast.error(r.error);
                    else {
                      toast.success("Turno cancelado");
                      router.refresh();
                    }
                  }}
                >
                  <XCircle className="h-4 w-4" />
                  Cancelar turno
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
