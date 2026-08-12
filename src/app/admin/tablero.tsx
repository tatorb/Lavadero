"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  MessageCircle,
  PlayCircle,
  Plus,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { formatARS, formatFecha } from "@/lib/format";
import { finalizarLavado, iniciarLavado } from "@/server/actions/lavados";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { HojaCobro } from "./hoja-cobro";

export interface LavadoEnCurso {
  id: string;
  cliente: string;
  clienteId: string;
  telefono: string | null;
  auto: string;
  patente: string | null;
  servicio: string;
  addons: string[];
  precioLista: number | null;
  llegadaISO: string;
  inicioISO: string | null;
  finISO: string | null;
}

type Etapa = "espera" | "lavando" | "listo";

const ETAPAS: Array<{
  clave: Etapa;
  titulo: string;
  vacio: string;
  color: string;
}> = [
  {
    clave: "espera",
    titulo: "Esperando",
    vacio: "Nadie esperando.",
    color: "bg-amber-500",
  },
  {
    clave: "lavando",
    titulo: "En lavado",
    vacio: "Ningún auto en el box.",
    color: "bg-sky-500",
  },
  {
    clave: "listo",
    titulo: "Listos para entregar",
    vacio: "Nada terminado sin entregar.",
    color: "bg-emerald-500",
  },
];

function etapaDe(l: LavadoEnCurso): Etapa {
  if (l.finISO) return "listo";
  if (l.inicioISO) return "lavando";
  return "espera";
}

/** Desde cuándo está el auto en la etapa actual. */
function desdeCuando(l: LavadoEnCurso): string {
  return l.finISO ?? l.inicioISO ?? l.llegadaISO;
}

function transcurrido(desdeISO: string, ahora: number): string {
  const minutos = Math.max(0, Math.floor((ahora - new Date(desdeISO).getTime()) / 60000));
  if (minutos < 1) return "recién";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "hace 1 día" : `hace ${dias} días`;
}

function TarjetaLavado({
  lavado,
  ahora,
  timezone,
  onCobrar,
}: {
  lavado: LavadoEnCurso;
  ahora: number;
  timezone: string;
  onCobrar: () => void;
}) {
  const router = useRouter();
  const [pendiente, setPendiente] = React.useState(false);
  const etapa = etapaDe(lavado);

  const avanzar = async () => {
    setPendiente(true);
    const r = etapa === "espera"
      ? await iniciarLavado(lavado.id)
      : await finalizarLavado(lavado.id);
    setPendiente(false);
    if (r?.error) toast.error(r.error);
    else {
      toast.success(etapa === "espera" ? "Lavado iniciado" : "Lavado terminado");
      router.refresh();
    }
  };

  const telefono = lavado.telefono?.replace(/[^\d+]/g, "");

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/admin/lavados/${lavado.id}`}
              className="font-medium leading-tight hover:underline"
            >
              {lavado.cliente}
            </Link>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Car className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{lavado.auto}</span>
              {lavado.patente && <Badge variant="muted">{lavado.patente}</Badge>}
            </p>
          </div>
          {lavado.precioLista != null && (
            <p className="shrink-0 text-sm font-semibold tabular-nums">
              {formatARS(lavado.precioLista)}
            </p>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          <p className="truncate">
            {lavado.servicio}
            {lavado.addons.length > 0 && ` + ${lavado.addons.join(", ")}`}
          </p>
          <p className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {transcurrido(desdeCuando(lavado), ahora)}
            <span className="opacity-60">
              · llegó {formatFecha(new Date(lavado.llegadaISO), "HH:mm", timezone)}
            </span>
          </p>
        </div>

        <div className="flex gap-2">
          {telefono && (
            <Button variant="outline" size="icon" asChild aria-label="WhatsApp">
              <a
                href={`https://wa.me/${telefono.replace(/^\+/, "")}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </Button>
          )}
          {etapa === "listo" ? (
            <Button className="flex-1" onClick={onCobrar}>
              <Wallet className="h-4 w-4" />
              Cobrar y entregar
            </Button>
          ) : (
            <Button className="flex-1" disabled={pendiente} onClick={avanzar}>
              {etapa === "espera" ? (
                <PlayCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {pendiente
                ? "Guardando…"
                : etapa === "espera"
                  ? "Empezar lavado"
                  : "Terminar"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const INTERVALO = 30_000;

/**
 * El reloj de pared es un sistema externo, no estado de React: leerlo con
 * `useSyncExternalStore` mantiene el "hace N min" al día sin desincronizar la
 * hidratación. El snapshot se redondea al intervalo para que sea estable entre
 * renders, y en el servidor se usa la hora con la que se armó la página.
 */
function useAhora(ahoraServidor: number) {
  return React.useSyncExternalStore(
    React.useCallback((onChange) => {
      const id = setInterval(onChange, INTERVALO);
      return () => clearInterval(id);
    }, []),
    () => Math.floor(Date.now() / INTERVALO) * INTERVALO,
    () => ahoraServidor
  );
}

export function Tablero({
  lavados,
  timezone,
  ahoraISO,
}: {
  lavados: LavadoEnCurso[];
  timezone: string;
  ahoraISO: string;
}) {
  const ahora = useAhora(new Date(ahoraISO).getTime());
  const [cobrando, setCobrando] = React.useState<LavadoEnCurso | null>(null);

  const porEtapa = (e: Etapa) => lavados.filter((l) => etapaDe(l) === e);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">En el lavadero</h1>
          <p className="text-sm text-muted-foreground">
            {lavados.length === 0
              ? "No hay autos en el lavadero"
              : `${lavados.length} ${lavados.length === 1 ? "auto" : "autos"} sin entregar`}
          </p>
        </div>
        {/* En desktop no hay barra inferior, así que el alta vive acá */}
        <Button asChild className="hidden lg:inline-flex">
          <Link href="/admin/nuevo">
            <Plus className="h-4 w-4" />
            Registrar llegada
          </Link>
        </Button>
      </div>

      {lavados.length === 0 ? (
        <EstadoVacio
          titulo="Todo tranquilo"
          descripcion="Cuando llegue un auto, registrá la llegada con el botón + y va a aparecer acá."
          accion={
            <Button asChild>
              <Link href="/admin/nuevo">
                <Plus className="h-4 w-4" />
                Registrar llegada
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {ETAPAS.map((etapa) => {
            const items = porEtapa(etapa.clave);
            return (
              <section key={etapa.clave} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${etapa.color}`} />
                  <h2 className="etiqueta">{etapa.titulo}</h2>
                  <span className="text-xs text-muted-foreground">({items.length})</span>
                </div>
                {items.length === 0 ? (
                  <p className="rounded-xl border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
                    {etapa.vacio}
                  </p>
                ) : (
                  items.map((l) => (
                    <TarjetaLavado
                      key={l.id}
                      lavado={l}
                      ahora={ahora}
                      timezone={timezone}
                      onCobrar={() => setCobrando(l)}
                    />
                  ))
                )}
              </section>
            );
          })}
        </div>
      )}

      <div className="lg:hidden">
        <Button variant="ghost" asChild className="w-full text-muted-foreground">
          <Link href="/admin/lavados">
            Ver todos los lavados
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {cobrando && (
        <HojaCobro lavado={cobrando} onCerrar={() => setCobrando(null)} />
      )}
    </div>
  );
}
