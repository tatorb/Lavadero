import Link from "next/link";
import {
  CalendarPlus,
  ChevronRight,
  Flame,
  Gift,
  Lock,
  Sparkles,
  Users,
  Waves,
} from "lucide-react";

import { requireCliente } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { formatFecha } from "@/lib/format";
import { calcularNivel } from "@/lib/gamificacion/niveles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MedidorNivel } from "@/components/cliente/medidor-nivel";
import { ESTADO_TURNO_BADGE } from "@/components/turnos/estado";

export default async function HomeCliente() {
  const user = await requireCliente();

  const [cliente, niveles, lavadero, lavadosTotales] = await Promise.all([
    prisma.cliente.findUniqueOrThrow({
      where: { id: user.id },
      include: {
        vinculadoCon: { select: { id: true, nombre: true, puntosTotal: true } },
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
    prisma.lavado.count({ where: { clienteId: user.id, canceladoAt: null } }),
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

  const colorNivel = estadoNivel.nivelActual?.color ?? undefined;

  return (
    <div className="space-y-5">
      {/* Encabezado editorial */}
      <header>
        {/* first-letter en vez de capitalize: "Sábado 8 de agosto", no "8 De Agosto" */}
        <p className="text-xs text-muted-foreground first-letter:uppercase">
          {formatFecha(new Date(), "EEEE d 'de' MMMM", lavadero.timezone)}
        </p>
        <h1 className="text-2xl font-bold">Hola, {cliente.nombre} 👋</h1>
      </header>

      {/* Medidor de nivel */}
      <Card className="shadow-elevada">
        <CardContent className="px-4 pb-5 pt-6">
          <MedidorNivel puntos={cliente.puntosTotal} progreso={estadoNivel.progreso} />
          <div className="mt-1 flex flex-col items-center gap-1.5">
            <span
              className="text-xl font-bold"
              style={colorNivel ? { color: colorNivel } : undefined}
            >
              Nivel {estadoNivel.nivelActual?.nombre ?? "—"}
            </span>
            {estadoNivel.nivelSiguiente ? (
              <p className="text-sm text-muted-foreground">
                {estadoNivel.puntosParaSiguiente === 1
                  ? "Te falta 1 punto"
                  : `Te faltan ${estadoNivel.puntosParaSiguiente} puntos`}{" "}
                para{" "}
                <span className="font-semibold text-foreground">
                  {estadoNivel.nivelSiguiente.nombre}
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                ¡Llegaste al nivel máximo! 🎉
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="space-y-1 p-4">
            <Flame className="h-5 w-5 text-primary" />
            <p className="dato-lg pt-1">{cliente.rachaActual}</p>
            <p className="etiqueta">
              {cliente.rachaActual === 1 ? "Visita seguida" : "Visitas seguidas"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-4">
            <Waves className="h-5 w-5 text-primary" />
            <p className="dato-lg pt-1">{lavadosTotales}</p>
            <p className="etiqueta">
              {lavadosTotales === 1 ? "Lavado" : "Lavados"}
            </p>
          </CardContent>
        </Card>
      </div>

      {cliente.vinculadoCon && (
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">
                Compartís cuenta con {cliente.vinculadoCon.nombre}
              </p>
              <p className="text-xs text-muted-foreground">
                Usan los autos del otro y comparten beneficios
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Próximo turno o llamada a la acción */}
      {proximoTurno ? (
        <Link href="/turnos" className="block">
          <Card className="transition-shadow hover:shadow-elevada active:opacity-80">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="etiqueta">Próximo turno</p>
                <p className="mt-1 font-semibold first-letter:uppercase">
                  {formatFecha(
                    proximoTurno.fechaTurno,
                    "EEEE d/MM 'a las' HH:mm",
                    lavadero.timezone
                  )}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge variant={ESTADO_TURNO_BADGE[proximoTurno.estado].variant}>
                    {ESTADO_TURNO_BADGE[proximoTurno.estado].label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {proximoTurno.servicio.nombre}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      ) : (
        <Button asChild className="h-12 w-full text-base shadow-halo">
          <Link href="/turnos/nuevo">
            <CalendarPlus className="h-5 w-5" />
            Pedir un turno
          </Link>
        </Button>
      )}

      {/* Beneficios */}
      <section className="space-y-2">
        <h2 className="etiqueta flex items-center gap-1.5">
          <Gift className="h-3.5 w-3.5" />
          Beneficios
        </h2>
        {descuentos.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Pronto vas a ver acá tus descuentos.
          </p>
        )}
        {descuentos.map((d) => {
          const bloqueado =
            d.nivel != null && (nivelEfectivo?.puntosMin ?? 0) < d.nivel.puntosMin;
          const faltan = d.nivel ? d.nivel.puntosMin - puntosEfectivos : 0;
          return (
            <Card key={d.id} className={bloqueado ? "shadow-none" : undefined}>
              <CardContent className="flex items-center gap-3 p-4">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: bloqueado
                      ? "var(--muted)"
                      : `${d.nivel?.color ?? "#3b82f6"}20`,
                    color: bloqueado
                      ? "var(--muted-foreground)"
                      : (d.nivel?.color ?? "#3b82f6"),
                  }}
                >
                  {bloqueado ? (
                    <Lock className="h-5 w-5" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={bloqueado ? "font-medium text-muted-foreground" : "font-medium"}>
                    {d.nombre}
                  </p>
                  {/* Telemetría: qué falta para desbloquearlo */}
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {bloqueado && faltan > 0
                      ? faltan === 1
                        ? "Te falta 1 punto para desbloquearlo"
                        : `Te faltan ${faltan} puntos para desbloquearlo`
                      : (d.descripcion ?? "Disponible para vos")}
                  </p>
                </div>
                {d.nivel && (
                  <Badge
                    variant="outline"
                    style={{ color: d.nivel.color ?? undefined }}
                  >
                    {d.nivel.nombre}
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* Próximamente */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { titulo: "Canjeá tus puntos", detalle: "Muy pronto" },
          { titulo: "Referí a un amigo", detalle: "Muy pronto" },
        ].map((c) => (
          <div
            key={c.titulo}
            className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-4 text-center"
          >
            <p className="text-sm font-medium text-muted-foreground">{c.titulo}</p>
            <p className="text-xs text-muted-foreground/70">{c.detalle}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
