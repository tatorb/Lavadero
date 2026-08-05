"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { ArrowLeft, Car, CheckCircle2, Clock3, Info, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { formatARS } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  crearTurnoCliente,
  obtenerSlotsDia,
  type SlotCliente,
} from "@/server/actions/turnos";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface AutoOption {
  id: string;
  label: string;
  sublabel: string;
  tipoVehiculo: string;
}

interface ServicioOption {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  precios?: Partial<Record<string, number>>;
  duracionMin: number;
  puntos: number;
  tipo: "PRINCIPAL" | "ADDON";
}

function precioServicio(s: ServicioOption, tipoVehiculo?: string): number {
  if (tipoVehiculo && s.precios?.[tipoVehiculo] != null) return s.precios[tipoVehiculo]!;
  return s.precio;
}

const PASOS = ["Auto", "Servicio", "Horario", "Confirmar"] as const;

export function NuevoTurnoWizard({
  autos,
  servicios,
  timezone,
}: {
  autos: AutoOption[];
  servicios: ServicioOption[];
  timezone: string;
}) {
  const router = useRouter();
  const [paso, setPaso] = React.useState(0);
  const [autoId, setAutoId] = React.useState("");
  const [servicioId, setServicioId] = React.useState("");
  const [addonIds, setAddonIds] = React.useState<string[]>([]);
  const [dia, setDia] = React.useState("");
  const [slots, setSlots] = React.useState<SlotCliente[] | null>(null);
  const [cargandoSlots, setCargandoSlots] = React.useState(false);
  const [slotISO, setSlotISO] = React.useState("");
  const [detalle, setDetalle] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const principales = servicios.filter((s) => s.tipo === "PRINCIPAL");
  const addons = servicios.filter((s) => s.tipo === "ADDON");
  const servicio = servicios.find((s) => s.id === servicioId);
  const slot = slots?.find((s) => s.fechaISO === slotISO);
  const tipoAuto = autos.find((a) => a.id === autoId)?.tipoVehiculo;

  const hoyLocal = toZonedTime(new Date(), timezone);
  const dias = Array.from({ length: 14 }, (_, i) => addDays(hoyLocal, i));

  const total =
    (servicio ? precioServicio(servicio, tipoAuto) : 0) +
    addonIds.reduce((sum, id) => {
      const a = servicios.find((s) => s.id === id);
      return sum + (a ? precioServicio(a, tipoAuto) : 0);
    }, 0);
  const puntos =
    (servicio?.puntos ?? 0) +
    addonIds.reduce((sum, id) => sum + (servicios.find((s) => s.id === id)?.puntos ?? 0), 0);

  const elegirDia = async (d: string) => {
    setDia(d);
    setSlotISO("");
    setCargandoSlots(true);
    setSlots(await obtenerSlotsDia(d));
    setCargandoSlots(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => (paso === 0 ? router.push("/turnos") : setPaso(paso - 1))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold">Pedir turno</h1>
          <p className="text-xs text-muted-foreground">
            Paso {paso + 1} de {PASOS.length}: {PASOS[paso]}
          </p>
        </div>
      </div>

      {/* Progreso */}
      <div className="flex gap-1.5">
        {PASOS.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              i <= paso ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Paso 1: Auto */}
      {paso === 0 && (
        <div className="space-y-3">
          {autos.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No tenés autos cargados. Pedile al lavadero que agregue tu auto.
              </CardContent>
            </Card>
          )}
          {autos.map((a) => (
            <button
              key={a.id}
              type="button"
              className="w-full"
              onClick={() => {
                setAutoId(a.id);
                setPaso(1);
              }}
            >
              <Card
                className={cn(
                  "transition-colors",
                  autoId === a.id && "border-primary bg-primary/5"
                )}
              >
                <CardContent className="flex items-center gap-3 p-4 text-left">
                  <Car className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{a.label}</p>
                    <p className="text-xs text-muted-foreground">{a.sublabel}</p>
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      {/* Paso 2: Servicio + addons */}
      {paso === 1 && (
        <div className="space-y-3">
          {principales.map((s) => (
            <button
              key={s.id}
              type="button"
              className="w-full"
              onClick={() => setServicioId(s.id)}
            >
              <Card
                className={cn(
                  "transition-colors",
                  servicioId === s.id && "border-primary bg-primary/5"
                )}
              >
                <CardContent className="p-4 text-left">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{s.nombre}</p>
                    <p className="font-semibold">{formatARS(precioServicio(s, tipoAuto))}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {s.descripcion} · {s.duracionMin} min · +{s.puntos} pts
                  </p>
                </CardContent>
              </Card>
            </button>
          ))}
          {addons.length > 0 && (
            <>
              <p className="pt-1 text-sm font-medium">Adicionales (opcional)</p>
              <div className="flex flex-wrap gap-2">
                {addons.map((a) => {
                  const activo = addonIds.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() =>
                        setAddonIds((prev) =>
                          activo ? prev.filter((id) => id !== a.id) : [...prev, a.id]
                        )
                      }
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm transition-colors",
                        activo
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input text-muted-foreground"
                      )}
                    >
                      {a.nombre} · {formatARS(precioServicio(a, tipoAuto))}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <Button className="w-full" disabled={!servicioId} onClick={() => setPaso(2)}>
            Continuar
          </Button>
        </div>
      )}

      {/* Paso 3: Día y horario */}
      {paso === 2 && (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {dias.map((d) => {
              const valor = format(d, "yyyy-MM-dd");
              return (
                <button
                  key={valor}
                  type="button"
                  onClick={() => elegirDia(valor)}
                  className={cn(
                    "flex w-14 shrink-0 flex-col items-center rounded-lg border py-2 text-sm transition-colors",
                    dia === valor
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background"
                  )}
                >
                  <span className="text-xs capitalize opacity-80">
                    {format(d, "EEE", { locale: es })}
                  </span>
                  <span className="font-semibold">{format(d, "d")}</span>
                </button>
              );
            })}
          </div>

          {cargandoSlots && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Buscando horarios…
            </p>
          )}
          {!cargandoSlots && slots && slots.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                El lavadero no atiende este día. Probá con otro.
              </CardContent>
            </Card>
          )}
          {!cargandoSlots && slots && slots.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {slots.map((s) => (
                  <button
                    key={s.fechaISO}
                    type="button"
                    disabled={s.estado !== "disponible"}
                    onClick={() => setSlotISO(s.fechaISO)}
                    className={cn(
                      "rounded-lg border py-2 text-sm font-medium transition-colors",
                      slotISO === s.fechaISO
                        ? "border-primary bg-primary text-primary-foreground"
                        : s.estado === "disponible"
                          ? "bg-background hover:border-primary"
                          : "cursor-not-allowed bg-muted text-muted-foreground/50 line-through"
                    )}
                  >
                    {s.hora}
                  </button>
                ))}
              </div>
              {slots.some((s) => s.estado === "fuera_de_anticipacion") && (
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Algunos horarios requieren reservar con más anticipación.
                </p>
              )}
            </>
          )}
          <Button className="w-full" disabled={!slotISO} onClick={() => setPaso(3)}>
            Continuar
          </Button>
        </div>
      )}

      {/* Paso 4: Confirmación */}
      {paso === 3 && slot && (
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-4 text-sm">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-muted-foreground" />
                {autos.find((a) => a.id === autoId)?.label}
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                {servicio?.nombre}
                {addonIds.length > 0 &&
                  ` + ${addonIds
                    .map((id) => servicios.find((s) => s.id === id)?.nombre)
                    .join(", ")}`}
              </div>
              <div className="flex items-center gap-2 capitalize">
                <Clock3 className="h-4 w-4 text-muted-foreground" />
                {format(
                  toZonedTime(new Date(slot.fechaISO), timezone),
                  "EEEE d 'de' MMMM, HH:mm 'hs'",
                  { locale: es }
                )}
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-muted-foreground">Total estimado</span>
                <span className="text-base font-bold">{formatARS(total)}</span>
              </div>
              <p className="flex items-center gap-1 text-xs text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Vas a sumar {puntos} puntos con este lavado
              </p>
            </CardContent>
          </Card>

          {!slot.confirmacionAuto && (
            <p className="flex items-start gap-1.5 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Este horario requiere aprobación: tu turno va a quedar pendiente hasta
              que el lavadero lo confirme.
            </p>
          )}

          <Textarea
            placeholder="¿Algo que debamos saber? (opcional)"
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
          />

          <Button
            className="h-12 w-full text-base"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              const r = await crearTurnoCliente({
                autoId,
                servicioId,
                addonIds,
                fechaISO: slot.fechaISO,
                detalle: detalle || undefined,
              });
              setPending(false);
              if (r?.error) toast.error(r.error);
              else {
                toast.success(
                  slot.confirmacionAuto
                    ? "¡Turno confirmado!"
                    : "Turno pedido — queda pendiente de confirmación"
                );
                router.push("/turnos");
              }
            }}
          >
            <CheckCircle2 className="h-5 w-5" />
            {pending
              ? "Reservando…"
              : slot.confirmacionAuto
                ? "Confirmar turno"
                : "Pedir turno"}
          </Button>
        </div>
      )}
    </div>
  );
}
