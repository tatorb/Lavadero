import Link from "next/link";
import {
  CalendarPlus,
  ChevronRight,
  Flame,
  Gift,
  Lock,
  Sparkles,
  Users,
} from "lucide-react";

import { requireCliente } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { formatFecha } from "@/lib/format";
import { calcularNivel } from "@/lib/gamificacion/niveles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ESTADO_TURNO_BADGE } from "@/components/turnos/estado";

export default async function HomeCliente() {
  const user = await requireCliente();

  const [cliente, niveles, lavadero] = await Promise.all([
    prisma.cliente.findUniqueOrThrow({
      where: { id: user.id },
      include: {
        vinculadoCon: {
          select: { id: true, nombre: true, puntosTotal: true },
        },
      },
    }),
    prisma.nivel.findMany({
      where: { lavaderoId: user.lavaderoId, activo: true },
      orderBy: { puntosMin: "asc" },
    }),
    prisma.lavadero.findUniqueOrThrow({
      where: { id: user.lavaderoId },
      select: { timezone: true },
    }),
  ]);

  const estadoNivel = calcularNivel(cliente.puntosTotal, niveles);

  // Nivel efectivo para descuentos: el mejor entre el propio y el del vinculado
  const puntosEfectivos = Math.max(
    cliente.puntosTotal,
    cliente.vinculadoCon?.puntosTotal ?? 0
  );
  const nivelEfectivo = calcularNivel(puntosEfectivos, niveles).nivelActual;

  const [proximoTurno, descuentos] = await Promise.all([
    prisma.turno.findFirst({
      where: {
        clienteId: cliente.id,
        estado: { in: ["PENDIENTE", "CONFIRMADO"] },
        fechaTurno: { gt: new Date() },
      },
      include: { servicio: true },
      orderBy: { fechaTurno: "asc" },
    }),
    prisma.descuento.findMany({
      where: {
        lavaderoId: user.lavaderoId,
        activo: true,
        OR: [{ validoHasta: null }, { validoHasta: { gte: new Date() } }],
      },
      include: { nivel: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const nivelColor = estadoNivel.nivelActual?.color ?? "#64748b";

  return (
    <div className="space-y-4">
      {/* Card de nivel */}
      <Card className="overflow-hidden border-0 text-white" style={{ background: `linear-gradient(135deg, ${nivelColor}, ${nivelColor}cc)` }}>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">Tu nivel</p>
              <p className="text-2xl font-bold">
                {estadoNivel.nivelActual?.nombre ?? "—"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/80">Puntos</p>
              <p className="text-2xl font-bold">{cliente.puntosTotal}</p>
            </div>
          </div>
          {estadoNivel.nivelSiguiente && (
            <div className="space-y-1">
              <div className="h-2.5 overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{ width: `${Math.round(estadoNivel.progreso * 100)}%` }}
                />
              </div>
              <p className="text-xs text-white/90">
                Te faltan {estadoNivel.puntosParaSiguiente} puntos para ser{" "}
                <span className="font-semibold">{estadoNivel.nivelSiguiente.nombre}</span>
              </p>
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <Badge className="border-0 bg-white/20 text-white">
              <Flame className="mr-1 h-3 w-3" />
              Racha: {cliente.rachaActual}{" "}
              {cliente.rachaActual === 1 ? "visita" : "visitas"}
            </Badge>
            {cliente.vinculadoCon && (
              <Badge className="border-0 bg-white/20 text-white">
                <Users className="mr-1 h-3 w-3" />
                Con {cliente.vinculadoCon.nombre}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Próximo turno / CTA */}
      {proximoTurno ? (
        <Link href="/turnos">
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-muted-foreground">Próximo turno</p>
                <p className="font-semibold">
                  {formatFecha(proximoTurno.fechaTurno, "EEEE d/MM 'a las' HH:mm", lavadero.timezone)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {proximoTurno.servicio.nombre} ·{" "}
                  <Badge variant={ESTADO_TURNO_BADGE[proximoTurno.estado].variant}>
                    {ESTADO_TURNO_BADGE[proximoTurno.estado].label}
                  </Badge>
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      ) : (
        <Button asChild className="h-12 w-full text-base">
          <Link href="/turnos/nuevo">
            <CalendarPlus className="h-5 w-5" />
            Pedir un turno
          </Link>
        </Button>
      )}

      {/* Descuentos */}
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Gift className="h-4 w-4 text-primary" />
          Descuentos y beneficios
        </h2>
        {descuentos.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Pronto vas a ver acá tus descuentos.
          </p>
        )}
        {descuentos.map((d) => {
          const bloqueado =
            d.nivel != null && (nivelEfectivo?.puntosMin ?? 0) < d.nivel.puntosMin;
          return (
            <Card key={d.id} className={bloqueado ? "opacity-70" : ""}>
              <CardContent className="flex items-center gap-3 p-4">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: `${d.nivel?.color ?? "#3b82f6"}20`,
                    color: d.nivel?.color ?? "#3b82f6",
                  }}
                >
                  {bloqueado ? <Lock className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{d.nombre}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {d.descripcion}
                  </p>
                </div>
                {d.nivel && (
                  <Badge
                    variant="outline"
                    style={{ color: d.nivel.color ?? undefined }}
                  >
                    {bloqueado ? `Desde ${d.nivel.nombre}` : d.nivel.nombre}
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Placeholders próximas features */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { titulo: "Canjeá tus puntos", detalle: "Muy pronto" },
          { titulo: "Referí a un amigo", detalle: "Muy pronto" },
        ].map((c) => (
          <Card key={c.titulo} className="border-dashed">
            <CardContent className="p-4 text-center">
              <p className="text-sm font-medium text-muted-foreground">{c.titulo}</p>
              <p className="text-xs text-muted-foreground/70">{c.detalle}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
