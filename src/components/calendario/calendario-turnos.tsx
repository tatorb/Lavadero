"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { addDays, addMonths, format, parse, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import {
  CalendarPlus,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Phone,
  Sparkles,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  cancelarTurno,
  confirmarTurno,
  crearTurnoAdmin,
  reprogramarTurno,
} from "@/server/actions/turnos";
import { ESTADO_TURNO_BADGE, ESTADO_TURNO_CARD, type EstadoTurno } from "@/components/turnos/estado";
import {
  NuevoLavadoForm,
  type ClienteConAutos,
  type ServicioOption,
} from "@/app/admin/lavados/lavados-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export type Vista = "dia" | "semana" | "mes";

export interface TurnoCal {
  id: string;
  fecha: string; // ISO UTC
  duracionMin: number;
  estado: EstadoTurno;
  origen: "CLIENTE" | "ADMIN";
  detalle: string | null;
  canceladoMotivo: string | null;
  conLavado: boolean;
  cliente: { id: string; nombre: string; telefono: string | null };
  auto: string | null;
  servicio: string;
  addons: string[];
}

const HORA_MIN = 8;
const HORA_MAX = 20;
const PX_POR_MIN = 1.1;

function claveDia(iso: string, tz: string) {
  return format(toZonedTime(new Date(iso), tz), "yyyy-MM-dd");
}

function horaLocal(iso: string, tz: string) {
  return format(toZonedTime(new Date(iso), tz), "HH:mm");
}

// ===== Tarjeta de turno =====

function TurnoCard({
  turno,
  tz,
  compacta,
  onClick,
  style,
}: {
  turno: TurnoCal;
  tz: string;
  compacta?: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={cn(
        "block w-full overflow-hidden rounded-md border-l-4 px-1.5 text-left text-xs shadow-sm transition-[box-shadow,opacity] hover:shadow-md active:opacity-60",
        ESTADO_TURNO_CARD[turno.estado],
        compacta ? "truncate py-0.5" : "absolute py-1"
      )}
    >
      <span className="font-semibold">{horaLocal(turno.fecha, tz)}</span>{" "}
      <span className="font-medium">{turno.cliente.nombre}</span>
      {!compacta && <div className="truncate opacity-80">{turno.servicio}</div>}
    </button>
  );
}

// ===== Vista semana / día =====

function VistaGrilla({
  dias,
  turnos,
  tz,
  hoy,
  onTurnoClick,
}: {
  dias: string[]; // yyyy-MM-dd locales
  turnos: TurnoCal[];
  tz: string;
  hoy: string;
  onTurnoClick: (t: TurnoCal) => void;
}) {
  const minutosVisibles = (HORA_MAX - HORA_MIN) * 60;
  const porDia = new Map<string, TurnoCal[]>();
  for (const t of turnos) {
    const k = claveDia(t.fecha, tz);
    porDia.set(k, [...(porDia.get(k) ?? []), t]);
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-background">
      <div
        className={cn("grid", dias.length > 1 && "min-w-[640px]")}
        style={{ gridTemplateColumns: `56px repeat(${dias.length}, minmax(0, 1fr))` }}
      >
        {/* Cabecera de días */}
        <div className="border-b" />
        {dias.map((dia) => {
          const d = parse(dia, "yyyy-MM-dd", new Date());
          return (
            <div
              key={dia}
              className={cn(
                "border-b border-l p-2 text-center text-sm",
                dia === hoy && "bg-primary/5"
              )}
            >
              <p className="capitalize text-muted-foreground">
                {format(d, "EEE", { locale: es })}
              </p>
              <p
                className={cn(
                  "mx-auto flex h-7 w-7 items-center justify-center rounded-full font-semibold",
                  dia === hoy && "bg-primary text-primary-foreground"
                )}
              >
                {format(d, "d")}
              </p>
            </div>
          );
        })}

        {/* Columna de horas */}
        <div className="relative" style={{ height: minutosVisibles * PX_POR_MIN }}>
          {Array.from({ length: HORA_MAX - HORA_MIN }, (_, i) => (
            <div
              key={i}
              className="absolute right-2 -translate-y-1/2 text-xs text-muted-foreground"
              style={{ top: i * 60 * PX_POR_MIN }}
            >
              {i > 0 && `${String(HORA_MIN + i).padStart(2, "0")}:00`}
            </div>
          ))}
        </div>

        {/* Columnas de días */}
        {dias.map((dia) => {
          const turnosDia = (porDia.get(dia) ?? []).filter(
            (t) => t.estado !== "CANCELADO"
          );
          // Turnos que comparten el mismo horario exacto se reparten el ancho
          const porSlot = new Map<string, TurnoCal[]>();
          for (const t of turnosDia) {
            porSlot.set(t.fecha, [...(porSlot.get(t.fecha) ?? []), t]);
          }

          return (
            <div
              key={dia}
              className={cn("relative border-l", dia === hoy && "bg-primary/5")}
              style={{ height: minutosVisibles * PX_POR_MIN }}
            >
              {Array.from({ length: HORA_MAX - HORA_MIN }, (_, i) => (
                <div
                  key={i}
                  className="absolute inset-x-0 border-t border-dashed border-border/60"
                  style={{ top: i * 60 * PX_POR_MIN }}
                />
              ))}
              {[...porSlot.values()].flatMap((grupo) =>
                grupo.map((t, idx) => {
                  const local = toZonedTime(new Date(t.fecha), tz);
                  const min = local.getHours() * 60 + local.getMinutes() - HORA_MIN * 60;
                  const top = Math.max(min, 0) * PX_POR_MIN;
                  const alto = Math.max(t.duracionMin * PX_POR_MIN, 22);
                  const ancho = 100 / grupo.length;
                  return (
                    <TurnoCard
                      key={t.id}
                      turno={t}
                      tz={tz}
                      onClick={() => onTurnoClick(t)}
                      style={{
                        top,
                        height: alto,
                        left: `calc(${idx * ancho}% + 2px)`,
                        width: `calc(${ancho}% - 4px)`,
                      }}
                    />
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== Vista mes =====

function VistaMes({
  fecha,
  turnos,
  tz,
  hoy,
  onTurnoClick,
  onDiaClick,
}: {
  fecha: string;
  turnos: TurnoCal[];
  tz: string;
  hoy: string;
  onTurnoClick: (t: TurnoCal) => void;
  onDiaClick: (dia: string) => void;
}) {
  const base = parse(fecha, "yyyy-MM-dd", new Date());
  const inicioMes = new Date(base.getFullYear(), base.getMonth(), 1);
  const inicio = startOfWeek(inicioMes, { weekStartsOn: 1 });
  const semanas: string[][] = [];
  let cursor = inicio;
  while (cursor <= new Date(base.getFullYear(), base.getMonth() + 1, 0)) {
    semanas.push(
      Array.from({ length: 7 }, (_, i) => format(addDays(cursor, i), "yyyy-MM-dd"))
    );
    cursor = addDays(cursor, 7);
  }

  const porDia = new Map<string, TurnoCal[]>();
  for (const t of turnos) {
    const k = claveDia(t.fecha, tz);
    porDia.set(k, [...(porDia.get(k) ?? []), t]);
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <div className="grid grid-cols-7 border-b text-center text-xs font-medium uppercase text-muted-foreground">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      {semanas.map((semana, i) => (
        <div key={i} className="grid grid-cols-7 border-b last:border-b-0">
          {semana.map((dia) => {
            const delMes = dia.slice(0, 7) === fecha.slice(0, 7);
            const turnosDia = porDia.get(dia) ?? [];
            const visibles = turnosDia.slice(0, 3);
            return (
              <div
                key={dia}
                className={cn(
                  "min-h-16 space-y-1 border-l p-1 first:border-l-0 sm:min-h-24",
                  !delMes && "bg-muted/40",
                  dia === hoy && "bg-primary/5"
                )}
              >
                <button
                  type="button"
                  onClick={() => onDiaClick(dia)}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium hover:bg-accent",
                    dia === hoy && "bg-primary text-primary-foreground hover:bg-primary",
                    !delMes && "text-muted-foreground/60"
                  )}
                >
                  {Number(dia.slice(8))}
                </button>
                {visibles.map((t) => (
                  <TurnoCard
                    key={t.id}
                    turno={t}
                    tz={tz}
                    compacta
                    onClick={() => onTurnoClick(t)}
                  />
                ))}
                {turnosDia.length > 3 && (
                  <button
                    type="button"
                    onClick={() => onDiaClick(dia)}
                    className="w-full text-left text-xs text-muted-foreground hover:underline"
                  >
                    +{turnosDia.length - 3} más
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ===== Dialog de detalle de turno =====

function TurnoDialog({
  turno,
  tz,
  clientes,
  servicios,
  onClose,
}: {
  turno: TurnoCal | null;
  tz: string;
  clientes: ClienteConAutos[];
  servicios: ServicioOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [modo, setModo] = React.useState<"ver" | "reprogramar" | "llegada">("ver");
  const [nuevaFecha, setNuevaFecha] = React.useState("");
  const [pending, setPending] = React.useState(false);

  if (!turno) return null;
  const badge = ESTADO_TURNO_BADGE[turno.estado];
  const local = toZonedTime(new Date(turno.fecha), tz);

  const ejecutar = async (fn: () => Promise<{ error?: string } | undefined>, msg: string) => {
    setPending(true);
    const r = await fn();
    setPending(false);
    if (r?.error) toast.error(r.error);
    else {
      toast.success(msg);
      onClose();
      router.refresh();
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {turno.servicio}
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        {modo === "ver" && (
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-muted-foreground" />
                <span className="capitalize">
                  {format(local, "EEEE d 'de' MMMM, HH:mm", { locale: es })} hs ·{" "}
                  {turno.duracionMin} min
                </span>
              </p>
              <p className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <a
                  className="font-medium text-primary hover:underline"
                  href={`/admin/clientes/${turno.cliente.id}`}
                >
                  {turno.cliente.nombre}
                </a>
                {turno.origen === "CLIENTE" && (
                  <Badge variant="muted">Pedido desde la app</Badge>
                )}
              </p>
              {turno.cliente.telefono && (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {turno.cliente.telefono}
                </p>
              )}
              {turno.auto && (
                <p className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  {turno.auto}
                </p>
              )}
              {turno.addons.length > 0 && (
                <p className="text-muted-foreground">
                  Adicionales: {turno.addons.join(", ")}
                </p>
              )}
              {turno.detalle && (
                <p className="rounded-md bg-muted p-2 text-muted-foreground">
                  {turno.detalle}
                </p>
              )}
              {turno.canceladoMotivo && (
                <p className="text-destructive">{turno.canceladoMotivo}</p>
              )}
            </div>

            {(turno.estado === "PENDIENTE" || turno.estado === "CONFIRMADO") && (
              <>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  {turno.estado === "PENDIENTE" && (
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        ejecutar(() => confirmarTurno(turno.id), "Turno confirmado")
                      }
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Confirmar
                    </Button>
                  )}
                  {turno.estado === "CONFIRMADO" && !turno.conLavado && (
                    <Button size="sm" disabled={pending} onClick={() => setModo("llegada")}>
                      <Car className="h-4 w-4" />
                      Registrar llegada
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => setModo("reprogramar")}
                  >
                    <Clock3 className="h-4 w-4" />
                    Reprogramar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    disabled={pending}
                    onClick={() =>
                      ejecutar(() => cancelarTurno(turno.id), "Turno cancelado")
                    }
                  >
                    <XCircle className="h-4 w-4" />
                    Cancelar turno
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {modo === "reprogramar" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nuevaFecha">Nueva fecha y hora</Label>
              <Input
                id="nuevaFecha"
                type="datetime-local"
                value={nuevaFecha}
                onChange={(e) => setNuevaFecha(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Horario local del lavadero. El turno queda confirmado.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                disabled={!nuevaFecha || pending}
                onClick={() =>
                  ejecutar(
                    () =>
                      reprogramarTurno(
                        turno.id,
                        fromZonedTime(nuevaFecha, tz).toISOString()
                      ),
                    "Turno reprogramado"
                  )
                }
              >
                Reprogramar
              </Button>
              <Button variant="outline" onClick={() => setModo("ver")}>
                Volver
              </Button>
            </div>
          </div>
        )}

        {modo === "llegada" && (
          <NuevoLavadoForm
            clientes={clientes}
            servicios={servicios}
            timezone={tz}
            turnoId={turno.id}
            clientePreseleccionado={turno.cliente.id}
            onDone={(id) => {
              onClose();
              if (id) router.push(`/admin/lavados/${id}`);
              else router.refresh();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ===== Dialog nuevo turno (admin) =====

function NuevoTurnoDialog({
  open,
  onOpenChange,
  clientes,
  servicios,
  tz,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientes: ClienteConAutos[];
  servicios: ServicioOption[];
  tz: string;
}) {
  const router = useRouter();
  const [clienteId, setClienteId] = React.useState("");
  const [autoId, setAutoId] = React.useState("");
  const [servicioId, setServicioId] = React.useState("");
  const [fechaLocal, setFechaLocal] = React.useState("");
  const [detalle, setDetalle] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const cliente = clientes.find((c) => c.id === clienteId);
  const principales = servicios.filter((s) => s.tipo === "PRINCIPAL");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo turno</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select
              value={clienteId}
              onValueChange={(v) => {
                setClienteId(v);
                setAutoId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Elegí un cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Auto (opcional)</Label>
            <Select value={autoId} onValueChange={setAutoId} disabled={!cliente}>
              <SelectTrigger>
                <SelectValue placeholder="Elegí el auto" />
              </SelectTrigger>
              <SelectContent>
                {cliente?.autos.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Servicio</Label>
            <Select value={servicioId} onValueChange={setServicioId}>
              <SelectTrigger>
                <SelectValue placeholder="Elegí el servicio" />
              </SelectTrigger>
              <SelectContent>
                {principales.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fechaTurno">Fecha y hora</Label>
            <Input
              id="fechaTurno"
              type="datetime-local"
              value={fechaLocal}
              onChange={(e) => setFechaLocal(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="detalleTurno">Detalle</Label>
            <Textarea
              id="detalleTurno"
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
            />
          </div>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <Button
            className="w-full"
            disabled={pending || !clienteId || !servicioId || !fechaLocal}
            onClick={async () => {
              setPending(true);
              setError(null);
              const r = await crearTurnoAdmin({
                clienteId,
                autoId: autoId || undefined,
                servicioId,
                fechaISO: fromZonedTime(fechaLocal, tz).toISOString(),
                detalle: detalle || undefined,
              });
              setPending(false);
              if (r?.error) setError(r.error);
              else {
                toast.success("Turno creado");
                onOpenChange(false);
                router.refresh();
              }
            }}
          >
            {pending ? "Creando…" : "Crear turno"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===== Componente principal =====

export function CalendarioTurnos({
  vista,
  fecha,
  hoy,
  timezone,
  turnos,
  clientes,
  servicios,
}: {
  vista: Vista;
  fecha: string;
  hoy: string;
  timezone: string;
  turnos: TurnoCal[];
  clientes: ClienteConAutos[];
  servicios: ServicioOption[];
}) {
  const router = useRouter();
  const [seleccionado, setSeleccionado] = React.useState<TurnoCal | null>(null);
  const [creando, setCreando] = React.useState(false);

  const base = parse(fecha, "yyyy-MM-dd", new Date());

  const navegar = (nuevaVista: Vista, nuevaFecha: string) => {
    router.push(`/admin/turnos?vista=${nuevaVista}&fecha=${nuevaFecha}`);
  };

  const mover = (dir: 1 | -1) => {
    const nueva =
      vista === "dia"
        ? addDays(base, dir)
        : vista === "semana"
          ? addDays(base, dir * 7)
          : addMonths(base, dir);
    navegar(vista, format(nueva, "yyyy-MM-dd"));
  };

  const titulo =
    vista === "mes"
      ? format(base, "MMMM yyyy", { locale: es })
      : vista === "dia"
        ? format(base, "EEEE d 'de' MMMM", { locale: es })
        : (() => {
            const inicio = startOfWeek(base, { weekStartsOn: 1 });
            const fin = addDays(inicio, 6);
            return `${format(inicio, "d MMM", { locale: es })} – ${format(fin, "d MMM yyyy", { locale: es })}`;
          })();

  const diasGrilla =
    vista === "dia"
      ? [fecha]
      : Array.from({ length: 7 }, (_, i) =>
          format(addDays(startOfWeek(base, { weekStartsOn: 1 }), i), "yyyy-MM-dd")
        );

  const pendientes = turnos.filter((t) => t.estado === "PENDIENTE").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Turnos</h1>
          <p className="text-sm text-muted-foreground">
            {pendientes > 0
              ? `${pendientes} turno${pendientes === 1 ? "" : "s"} pendiente${pendientes === 1 ? "" : "s"} de confirmación en este período`
              : "Agenda del lavadero"}
          </p>
        </div>
        <Button onClick={() => setCreando(true)}>
          <CalendarPlus className="h-4 w-4" />
          Nuevo turno
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => mover(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => mover(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => navegar(vista, hoy)}>
            Hoy
          </Button>
          <h2 className="ml-2 text-lg font-semibold capitalize">{titulo}</h2>
        </div>
        <Tabs value={vista} onValueChange={(v) => navegar(v as Vista, fecha)}>
          <TabsList>
            <TabsTrigger value="dia">Día</TabsTrigger>
            <TabsTrigger value="semana">Semana</TabsTrigger>
            <TabsTrigger value="mes">Mes</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {vista === "mes" ? (
        <VistaMes
          fecha={fecha}
          turnos={turnos}
          tz={timezone}
          hoy={hoy}
          onTurnoClick={setSeleccionado}
          onDiaClick={(dia) => navegar("dia", dia)}
        />
      ) : (
        <VistaGrilla
          dias={diasGrilla}
          turnos={turnos}
          tz={timezone}
          hoy={hoy}
          onTurnoClick={setSeleccionado}
        />
      )}

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {(Object.keys(ESTADO_TURNO_BADGE) as EstadoTurno[]).map((estado) => (
          <span key={estado} className="flex items-center gap-1.5">
            <span
              className={cn("h-3 w-3 rounded-sm border-l-4", ESTADO_TURNO_CARD[estado])}
            />
            {ESTADO_TURNO_BADGE[estado].label}
          </span>
        ))}
      </div>

      <TurnoDialog
        key={seleccionado?.id ?? "ninguno"}
        turno={seleccionado}
        tz={timezone}
        clientes={clientes}
        servicios={servicios}
        onClose={() => setSeleccionado(null)}
      />
      <NuevoTurnoDialog
        open={creando}
        onOpenChange={setCreando}
        clientes={clientes}
        servicios={servicios}
        tz={timezone}
      />
    </div>
  );
}
