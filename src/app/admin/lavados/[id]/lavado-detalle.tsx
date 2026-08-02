"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Clock, Flag, Play, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { formatARS, formatFecha } from "@/lib/format";
import {
  editarDetallesLavado,
  finalizarLavado,
  iniciarLavado,
} from "@/server/actions/lavados";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

interface LavadoData {
  id: string;
  cliente: { id: string; nombre: string };
  auto: string;
  servicio: string;
  addons: Array<{ nombre: string; precio: number }>;
  llegadaAt: string;
  inicioAt: string | null;
  finAt: string | null;
  detalles: string | null;
  precioFinal: number | null;
  puntosOtorgados: number;
  deTurno: boolean;
}

function PasoTimeline({
  icono,
  titulo,
  fecha,
  activo,
  accion,
}: {
  icono: React.ReactNode;
  titulo: string;
  fecha: string | null;
  activo: boolean;
  accion?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
          fecha
            ? "border-primary bg-primary text-primary-foreground"
            : activo
              ? "border-primary text-primary"
              : "border-muted-foreground/30 text-muted-foreground/50"
        }`}
      >
        {fecha ? <Check className="h-5 w-5" /> : icono}
      </div>
      <div className="flex-1">
        <p className={`font-medium ${!fecha && !activo ? "text-muted-foreground/60" : ""}`}>
          {titulo}
        </p>
        <p className="text-sm text-muted-foreground">
          {fecha ? formatFecha(new Date(fecha)) : activo ? "Pendiente" : "—"}
        </p>
      </div>
      {accion}
    </div>
  );
}

export function LavadoDetalle({ lavado }: { lavado: LavadoData }) {
  const router = useRouter();
  const [detalles, setDetalles] = React.useState(lavado.detalles ?? "");
  const [pendiente, setPendiente] = React.useState(false);

  const accion = async (fn: () => Promise<{ error?: string } | undefined>) => {
    setPendiente(true);
    const r = await fn();
    setPendiente(false);
    if (r?.error) toast.error(r.error);
    else router.refresh();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/lavados">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{lavado.servicio}</h1>
          <p className="text-sm text-muted-foreground">
            <Link
              href={`/admin/clientes/${lavado.cliente.id}`}
              className="text-primary hover:underline"
            >
              {lavado.cliente.nombre}
            </Link>{" "}
            · {lavado.auto}
            {lavado.deTurno && (
              <Badge variant="info" className="ml-2">
                Con turno
              </Badge>
            )}
          </p>
        </div>
        {lavado.finAt ? (
          <Badge variant="success">Finalizado</Badge>
        ) : lavado.inicioAt ? (
          <Badge variant="info">En curso</Badge>
        ) : (
          <Badge variant="warning">En espera</Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estado del lavado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <PasoTimeline
            icono={<Clock className="h-5 w-5" />}
            titulo="Llegada al lavadero"
            fecha={lavado.llegadaAt}
            activo={false}
          />
          <PasoTimeline
            icono={<Play className="h-5 w-5" />}
            titulo="Inicio del lavado"
            fecha={lavado.inicioAt}
            activo={!lavado.inicioAt}
            accion={
              !lavado.inicioAt ? (
                <Button
                  size="sm"
                  disabled={pendiente}
                  onClick={() => accion(() => iniciarLavado(lavado.id))}
                >
                  <Play className="h-4 w-4" />
                  Iniciar
                </Button>
              ) : undefined
            }
          />
          <PasoTimeline
            icono={<Flag className="h-5 w-5" />}
            titulo="Finalización"
            fecha={lavado.finAt}
            activo={!!lavado.inicioAt && !lavado.finAt}
            accion={
              lavado.inicioAt && !lavado.finAt ? (
                <Button
                  size="sm"
                  disabled={pendiente}
                  onClick={() => accion(() => finalizarLavado(lavado.id))}
                >
                  <Flag className="h-4 w-4" />
                  Finalizar
                </Button>
              ) : undefined
            }
          />
          {lavado.finAt && lavado.puntosOtorgados > 0 && (
            <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
              <Sparkles className="h-4 w-4" />
              El cliente sumó {lavado.puntosOtorgados} puntos con este lavado
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Servicio y precio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>{lavado.servicio}</span>
            <span className="text-muted-foreground">
              {lavado.precioFinal != null
                ? formatARS(
                    lavado.precioFinal - lavado.addons.reduce((s, a) => s + a.precio, 0)
                  )
                : "—"}
            </span>
          </div>
          {lavado.addons.map((a) => (
            <div key={a.nombre} className="flex justify-between text-muted-foreground">
              <span>+ {a.nombre}</span>
              <span>{formatARS(a.precio)}</span>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{lavado.precioFinal != null ? formatARS(lavado.precioFinal) : "—"}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={detalles}
            onChange={(e) => setDetalles(e.target.value)}
            placeholder="Observaciones del lavado…"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={pendiente || detalles === (lavado.detalles ?? "")}
            onClick={() =>
              accion(async () => {
                const r = await editarDetallesLavado(lavado.id, detalles);
                if (!r?.error) toast.success("Detalles guardados");
                return r;
              })
            }
          >
            Guardar detalles
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
