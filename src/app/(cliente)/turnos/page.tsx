import Link from "next/link";
import { CalendarPlus } from "lucide-react";

import { requireCliente } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MisTurnos } from "./mis-turnos";

export const metadata = { title: "Mis turnos" };

export default async function TurnosClientePage() {
  const user = await requireCliente();
  const [turnos, lavadero] = await Promise.all([
    prisma.turno.findMany({
      where: { clienteId: user.id },
      include: { servicio: true, auto: true },
      orderBy: { fechaTurno: "desc" },
      take: 50,
    }),
    prisma.lavadero.findUniqueOrThrow({
      where: { id: user.lavaderoId },
      select: { timezone: true },
    }),
  ]);

  // Server component: el "ahora" se captura al momento del request
  // eslint-disable-next-line react-hooks/purity
  const ahora = Date.now();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Mis turnos</h1>
        <Button asChild size="sm">
          <Link href="/turnos/nuevo">
            <CalendarPlus className="h-4 w-4" />
            Nuevo
          </Link>
        </Button>
      </div>
      {turnos.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No tenés turnos todavía. ¡Pedí el primero!
          </CardContent>
        </Card>
      ) : (
        <MisTurnos
          timezone={lavadero.timezone}
          turnos={turnos.map((t) => ({
            id: t.id,
            fecha: t.fechaTurno.toISOString(),
            servicio: t.servicio.nombre,
            auto: t.auto ? `${t.auto.marca} ${t.auto.modelo}` : null,
            estado: t.estado,
            futuro: t.fechaTurno.getTime() > ahora,
          }))}
        />
      )}
    </div>
  );
}
