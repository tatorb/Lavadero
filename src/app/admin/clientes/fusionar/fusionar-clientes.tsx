"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Archive, ArrowLeft, Check, Merge, X } from "lucide-react";
import { toast } from "sonner";

import type { Confianza, ParDuplicado } from "@/lib/clientes/duplicados";
import { formatDia } from "@/lib/format";
import {
  archivarCliente,
  fusionarClientes,
  previsualizarFusion,
  type ResumenFusion,
} from "@/server/actions/clientes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BuscadorCliente, type ItemBuscable } from "@/components/admin/buscador-cliente";

export interface ClienteFicha {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  detalles: string | null;
  lavados: number;
  autos: number;
  turnos: number;
  puntos: number;
  ultimaVisita: string | null;
  activo: boolean;
  conCuenta: boolean;
  vinculado: boolean;
  alerta: string | null;
}

const BADGE_CONFIANZA: Record<Confianza, { variant: "success" | "warning" | "muted"; label: string }> =
  {
    alta: { variant: "success", label: "Muy probable" },
    media: { variant: "warning", label: "Probable" },
    baja: { variant: "muted", label: "Dudoso" },
  };

/** Columna con los datos de un cliente, seleccionable como principal. */
function FichaCliente({
  cliente,
  principal,
  onElegir,
}: {
  cliente: ClienteFicha;
  principal: boolean;
  onElegir: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onElegir}
      aria-pressed={principal}
      className={`flex-1 rounded-xl border p-3 text-left transition active:scale-[0.99] ${
        principal
          ? "border-primary bg-primary/5 shadow-halo"
          : "border-border bg-card hover:border-muted-foreground/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium leading-tight">{cliente.nombre}</span>
        {principal && (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-3 w-3" />
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {cliente.lavados} lavados · {cliente.autos} autos · {cliente.puntos} pts
      </p>
      {cliente.telefono && (
        <p className="text-xs text-muted-foreground">{cliente.telefono}</p>
      )}
      {cliente.email && (
        <p className="truncate text-xs text-muted-foreground">{cliente.email}</p>
      )}
      {cliente.ultimaVisita && (
        <p className="text-xs text-muted-foreground">
          Última visita {formatDia(new Date(cliente.ultimaVisita))}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-1">
        {cliente.conCuenta && <Badge variant="success">App</Badge>}
        {cliente.vinculado && <Badge variant="info">Vinculado</Badge>}
        {!cliente.activo && <Badge variant="muted">Archivado</Badge>}
      </div>
    </button>
  );
}

/**
 * Diálogo de confirmación: pide el resumen al servidor antes de fusionar.
 * Se monta recién al abrirse, así el resumen siempre corresponde al par actual.
 */
function ConfirmarFusion({
  principalId,
  duplicadoId,
  onCerrar,
  onFusionado,
}: {
  principalId: string;
  duplicadoId: string;
  onCerrar: () => void;
  onFusionado: () => void;
}) {
  const [resumen, setResumen] = React.useState<ResumenFusion | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [enviando, setEnviando] = React.useState(false);

  React.useEffect(() => {
    let vigente = true;
    previsualizarFusion(principalId, duplicadoId).then((r) => {
      if (!vigente) return;
      if (r.error) setError(r.error);
      else setResumen(r.resumen ?? null);
    });
    return () => {
      vigente = false;
    };
  }, [principalId, duplicadoId]);

  return (
    <Dialog open onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar fusión</DialogTitle>
        </DialogHeader>
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        {!resumen && !error && (
          <p className="text-sm text-muted-foreground">Calculando…</p>
        )}
        {resumen && (
          <div className="space-y-4">
            <p className="text-sm">
              Todo lo de <strong>{resumen.duplicado}</strong> pasa a{" "}
              <strong>{resumen.principal}</strong>, y{" "}
              <strong>{resumen.duplicado}</strong> deja de existir.
            </p>
            <div className="grid grid-cols-3 gap-2 rounded-xl border bg-muted/40 p-3 text-center">
              {[
                ["Lavados", resumen.lavados],
                ["Autos", resumen.autos],
                ["Turnos", resumen.turnos],
                ["Puntos", resumen.puntos],
                ["Cuenta", resumen.movimientosCuenta],
                ["Caja", resumen.movimientosCaja],
              ].map(([label, valor]) => (
                <div key={label as string}>
                  <p className="text-lg font-semibold tabular-nums">{valor}</p>
                  <p className="etiqueta text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {resumen.avisos.map((aviso) => (
                <li key={aviso} className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                  <span>{aviso}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs font-medium text-destructive">
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onCerrar}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                disabled={enviando}
                onClick={async () => {
                  setEnviando(true);
                  const r = await fusionarClientes(principalId, duplicadoId);
                  setEnviando(false);
                  if (r?.error) {
                    setError(r.error);
                    return;
                  }
                  toast.success("Clientes fusionados");
                  onFusionado();
                }}
              >
                {enviando ? "Fusionando…" : "Fusionar"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Tarjeta de un par sugerido: elegir cuál queda y fusionar o descartar. */
function ParSugerido({
  a,
  b,
  par,
  onDescartar,
  onFusionado,
}: {
  a: ClienteFicha;
  b: ClienteFicha;
  par: ParDuplicado;
  onDescartar: () => void;
  onFusionado: () => void;
}) {
  // Por defecto gana el que tenga más historial y, a igualdad, el que tenga la
  // ficha más completa: es el que menos información pierde
  const peso = (c: ClienteFicha) =>
    c.lavados * 100 +
    c.autos * 10 +
    (c.conCuenta ? 5 : 0) +
    (c.telefono ? 2 : 0) +
    (c.email ? 1 : 0);
  const [principalId, setPrincipalId] = React.useState(
    peso(a) >= peso(b) ? a.id : b.id
  );
  const [confirmando, setConfirmando] = React.useState(false);
  const badge = BADGE_CONFIANZA[par.confianza];
  const duplicadoId = principalId === a.id ? b.id : a.id;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={badge.variant}>{badge.label}</Badge>
          <span className="text-xs text-muted-foreground">{par.motivo}</span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <FichaCliente
            cliente={a}
            principal={principalId === a.id}
            onElegir={() => setPrincipalId(a.id)}
          />
          <FichaCliente
            cliente={b}
            principal={principalId === b.id}
            onElegir={() => setPrincipalId(b.id)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Tocá el que querés conservar. El otro se fusiona dentro.
        </p>
        <div className="flex gap-2 sm:justify-end">
          <Button variant="outline" size="sm" onClick={onDescartar}>
            <X className="h-4 w-4" />
            No son el mismo
          </Button>
          <Button
            size="sm"
            className="flex-1 sm:flex-none sm:min-w-44"
            onClick={() => setConfirmando(true)}
          >
            <Merge className="h-4 w-4" />
            Fusionar
          </Button>
        </div>
        {confirmando && (
          <ConfirmarFusion
            principalId={principalId}
            duplicadoId={duplicadoId}
            onCerrar={() => setConfirmando(false)}
            onFusionado={() => {
              setConfirmando(false);
              onFusionado();
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

export function FusionarClientes({
  clientes,
  pares,
}: {
  clientes: ClienteFicha[];
  pares: ParDuplicado[];
}) {
  const router = useRouter();
  const porId = React.useMemo(
    () => new Map(clientes.map((c) => [c.id, c])),
    [clientes]
  );

  const [descartados, setDescartados] = React.useState<Set<string>>(new Set());
  const [confianzas, setConfianzas] = React.useState<Set<Confianza>>(
    new Set<Confianza>(["alta", "media"])
  );
  const [manualA, setManualA] = React.useState<ItemBuscable | null>(null);
  const [manualB, setManualB] = React.useState<ItemBuscable | null>(null);
  const [confirmandoManual, setConfirmandoManual] = React.useState(false);
  const [archivando, setArchivando] = React.useState<string | null>(null);

  const refrescar = () => router.refresh();

  const opciones: ItemBuscable[] = clientes.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    detalle: `${c.lavados} lavados · ${c.puntos} pts`,
    alias: [c.telefono, c.email],
  }));

  const visibles = pares.filter(
    (p) =>
      confianzas.has(p.confianza) &&
      !descartados.has(`${p.aId}-${p.bId}`) &&
      porId.has(p.aId) &&
      porId.has(p.bId)
  );

  const conteo = (c: Confianza) => pares.filter((p) => p.confianza === c).length;
  const revisar = clientes.filter((c) => c.alerta && c.activo);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/admin/clientes">
          <ArrowLeft className="h-4 w-4" />
          Volver a clientes
        </Link>
      </Button>

      <Tabs defaultValue="sugerencias">
        <TabsList className="w-full">
          <TabsTrigger value="sugerencias" className="flex-1">
            Sugerencias
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex-1">
            Manual
          </TabsTrigger>
          <TabsTrigger value="revisar" className="flex-1">
            Revisar {revisar.length > 0 && `(${revisar.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sugerencias" className="space-y-4 pt-4">
          <div className="flex flex-wrap gap-2">
            {(["alta", "media", "baja"] as const).map((c) => (
              <Button
                key={c}
                size="sm"
                variant={confianzas.has(c) ? "default" : "outline"}
                onClick={() =>
                  setConfianzas((prev) => {
                    const siguiente = new Set(prev);
                    if (siguiente.has(c)) siguiente.delete(c);
                    else siguiente.add(c);
                    return siguiente;
                  })
                }
              >
                {BADGE_CONFIANZA[c].label} ({conteo(c)})
              </Button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Acá no aparecen los familiares anotados por su relación (&ldquo;Esposa
            Luis&rdquo;): son otra persona, no un duplicado. Esos se cargan en{" "}
            <Link href="/admin/clientes/vinculos" className="text-primary underline">
              Vínculos
            </Link>
            .
          </p>

          {visibles.length === 0 ? (
            <EstadoVacio
              titulo="Sin sugerencias"
              descripcion="No hay pares sospechosos con los filtros elegidos. Si igual sabés de dos clientes repetidos, usá la pestaña Manual."
            />
          ) : (
            <div className="space-y-3">
              {visibles.map((par) => (
                <ParSugerido
                  key={`${par.aId}-${par.bId}`}
                  par={par}
                  a={porId.get(par.aId)!}
                  b={porId.get(par.bId)!}
                  onDescartar={() =>
                    setDescartados((prev) => new Set(prev).add(`${par.aId}-${par.bId}`))
                  }
                  onFusionado={refrescar}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="manual" className="space-y-4 pt-4">
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="space-y-2">
                <p className="etiqueta text-muted-foreground">Cliente que queda</p>
                <BuscadorCliente
                  items={opciones.filter((o) => o.id !== manualB?.id)}
                  seleccionado={manualA}
                  onSeleccionar={setManualA}
                  placeholder="Buscar el cliente principal…"
                />
              </div>
              <div className="space-y-2">
                <p className="etiqueta text-muted-foreground">Cliente que se absorbe</p>
                <BuscadorCliente
                  items={opciones.filter((o) => o.id !== manualA?.id)}
                  seleccionado={manualB}
                  onSeleccionar={setManualB}
                  placeholder="Buscar el duplicado…"
                />
              </div>
              <Button
                className="w-full"
                disabled={!manualA || !manualB}
                onClick={() => setConfirmandoManual(true)}
              >
                <Merge className="h-4 w-4" />
                Fusionar
              </Button>
              {manualA && manualB && confirmandoManual && (
                <ConfirmarFusion
                  principalId={manualA.id}
                  duplicadoId={manualB.id}
                  onCerrar={() => setConfirmandoManual(false)}
                  onFusionado={() => {
                    setConfirmandoManual(false);
                    setManualA(null);
                    setManualB(null);
                    refrescar();
                  }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revisar" className="space-y-3 pt-4">
          <p className="text-sm text-muted-foreground">
            Estas filas del registro no parecen personas. Archivalas para sacarlas de los
            listados sin perder los lavados que tienen cargados.
          </p>
          {revisar.length === 0 ? (
            <EstadoVacio
              titulo="Todo limpio"
              descripcion="No quedan filas raras en la lista de clientes."
            />
          ) : (
            revisar.map((c) => (
              <Card key={c.id}>
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/clientes/${c.id}`}
                      className="font-medium hover:underline"
                    >
                      {c.nombre}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {c.alerta} · {c.lavados} lavados · {c.autos} autos
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={archivando === c.id}
                    onClick={async () => {
                      setArchivando(c.id);
                      const r = await archivarCliente(c.id, true);
                      setArchivando(null);
                      if (r?.error) toast.error(r.error);
                      else {
                        toast.success("Cliente archivado");
                        refrescar();
                      }
                    }}
                  >
                    <Archive className="h-4 w-4" />
                    Archivar
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
