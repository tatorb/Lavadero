import Link from "next/link";
import { Sparkles, Waves } from "lucide-react";

import { requireCliente } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { formatARS, formatFecha } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EstadoVacio } from "@/components/ui/estado-vacio";

export const metadata = { title: "Mi historial" };

export default async function HistorialPage() {
  const user = await requireCliente();
  const [lavados, lavadero] = await Promise.all([
    prisma.lavado.findMany({
      where: { clienteId: user.id },
      include: { servicio: true, auto: true, addons: { include: { servicio: true } } },
      orderBy: { llegadaAt: "desc" },
      take: 100,
    }),
    prisma.lavadero.findUniqueOrThrow({
      where: { id: user.lavaderoId },
      select: { timezone: true },
    }),
  ]);

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Mi historial</h1>
      {lavados.length === 0 && (
        <EstadoVacio
          icono={<Waves className="h-5 w-5" />}
          titulo="Todavía no tenés lavados"
          descripcion="Cuando pases por el lavadero vas a ver acá el detalle de cada lavado y los puntos que sumaste."
          accion={
            <Button asChild size="sm">
              <Link href="/turnos/nuevo">Pedir mi primer turno</Link>
            </Button>
          }
        />
      )}
      {lavados.map((l) => (
        <Card key={l.id}>
          <CardContent className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Waves className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">{l.servicio.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFecha(l.llegadaAt, "dd/MM/yyyy HH:mm", lavadero.timezone)} ·{" "}
                    {l.auto.marca} {l.auto.modelo}
                  </p>
                </div>
              </div>
              {l.finAt ? (
                <Badge variant="success">Finalizado</Badge>
              ) : (
                <Badge variant="warning">En curso</Badge>
              )}
            </div>
            {l.addons.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Adicionales: {l.addons.map((a) => a.servicio.nombre).join(", ")}
              </p>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {l.precioFinal != null ? formatARS(l.precioFinal) : ""}
              </span>
              {l.puntosOtorgados > 0 && (
                <span className="flex items-center gap-1 font-medium text-primary">
                  <Sparkles className="h-3.5 w-3.5" />+{l.puntosOtorgados} pts
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
