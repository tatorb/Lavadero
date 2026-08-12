"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Car, Check, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { formatARS } from "@/lib/format";
import { crearAuto, crearCliente } from "@/server/actions/clientes";
import { crearLavado } from "@/server/actions/lavados";
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
import { TIPOS_VEHICULO } from "@/lib/format";
import { BuscadorCliente, type ItemBuscable } from "@/components/admin/buscador-cliente";
import { ClienteForm } from "../clientes/clientes-table";

export interface AutoFlujo {
  id: string;
  label: string;
  tipoVehiculo: string;
  /** Nombre del cliente vinculado, si el auto es de él */
  deVinculado: string | null;
}

export interface ClienteFlujo {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  autos: AutoFlujo[];
}

export interface ServicioFlujo {
  id: string;
  nombre: string;
  tipo: "PRINCIPAL" | "ADDON";
  precio: number;
  precios: Record<string, number>;
}

function precioDe(s: ServicioFlujo, tipoVehiculo?: string): number {
  if (tipoVehiculo && s.precios[tipoVehiculo] != null) return s.precios[tipoVehiculo];
  return s.precio;
}

/** Cabecera de paso: número, título y el dato ya elegido. */
function Paso({
  numero,
  titulo,
  elegido,
  onCambiar,
  children,
}: {
  numero: number;
  titulo: string;
  elegido?: string;
  onCambiar?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            elegido
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {elegido ? <Check className="h-3.5 w-3.5" /> : numero}
        </span>
        <h2 className="etiqueta flex-1">{titulo}</h2>
        {elegido && onCambiar && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={onCambiar}
          >
            Cambiar
          </Button>
        )}
      </div>
      {elegido ? (
        <p className="rounded-xl border border-primary bg-primary/5 px-3 py-2.5 font-medium">
          {elegido}
        </p>
      ) : (
        children
      )}
    </section>
  );
}

/** Alta rápida de un auto para el cliente ya elegido. */
function DialogoAuto({
  clienteId,
  onCerrar,
}: {
  clienteId: string;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [estado, accion, pendiente] = React.useActionState(
    async (prev: undefined | { error?: string; ok?: boolean }, formData: FormData) => {
      const r = await crearAuto(clienteId, prev, formData);
      if (r?.ok) {
        toast.success("Auto agregado");
        router.refresh();
        onCerrar();
      }
      return r;
    },
    undefined
  );

  return (
    <Dialog open onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar auto</DialogTitle>
        </DialogHeader>
        <form action={accion} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="marca">Marca</Label>
              <Input id="marca" name="marca" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modelo">Modelo</Label>
              <Input id="modelo" name="modelo" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patente">Patente</Label>
              <Input id="patente" name="patente" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select name="tipo" defaultValue="AUTO">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_VEHICULO.map(([valor, label]) => (
                    <SelectItem key={valor} value={valor}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {estado?.error && (
            <p className="text-sm font-medium text-destructive">{estado.error}</p>
          )}
          <Button type="submit" className="w-full" disabled={pendiente}>
            {pendiente ? "Guardando…" : "Agregar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NuevoLavadoFlujo({
  clientes,
  servicios,
}: {
  clientes: ClienteFlujo[];
  servicios: ServicioFlujo[];
}) {
  const router = useRouter();
  const [clienteId, setClienteId] = React.useState<string | null>(null);
  const [autoId, setAutoId] = React.useState<string | null>(null);
  const [servicioId, setServicioId] = React.useState<string | null>(null);
  const [addonIds, setAddonIds] = React.useState<string[]>([]);
  const [creandoCliente, setCreandoCliente] = React.useState(false);
  const [creandoAuto, setCreandoAuto] = React.useState(false);
  const [enviando, setEnviando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const cliente = clientes.find((c) => c.id === clienteId) ?? null;
  // Entre que se crea un cliente y que el refresh trae la lista nueva hay un
  // instante en que el id existe pero la ficha no
  const esperandoCliente = clienteId !== null && cliente === null;
  const auto = cliente?.autos.find((a) => a.id === autoId) ?? null;
  const servicio = servicios.find((s) => s.id === servicioId) ?? null;
  const principales = servicios.filter((s) => s.tipo === "PRINCIPAL");
  const addons = servicios.filter((s) => s.tipo === "ADDON");

  const total =
    (servicio ? precioDe(servicio, auto?.tipoVehiculo) : 0) +
    addonIds.reduce((sum, id) => {
      const a = servicios.find((s) => s.id === id);
      return sum + (a ? precioDe(a, auto?.tipoVehiculo) : 0);
    }, 0);

  const opciones: ItemBuscable[] = clientes.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    detalle: c.autos.length === 1 ? c.autos[0].label : `${c.autos.length} autos`,
    alias: [c.telefono, c.email],
  }));

  const registrar = async () => {
    if (!clienteId || !autoId || !servicioId) return;
    setEnviando(true);
    setError(null);
    const r = await crearLavado({ clienteId, autoId, servicioId, addonIds });
    setEnviando(false);
    if (r?.error) {
      setError(r.error);
      return;
    }
    toast.success("Llegada registrada");
    router.push("/admin");
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Volver">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Registrar llegada</h1>
          <p className="text-sm text-muted-foreground">
            El lavado arranca en espera y queda en el tablero.
          </p>
        </div>
      </div>

      <Paso
        numero={1}
        titulo="Cliente"
        elegido={cliente?.nombre}
        onCambiar={() => {
          setClienteId(null);
          setAutoId(null);
        }}
      >
        <div className="space-y-2">
          <BuscadorCliente
            items={opciones}
            seleccionado={null}
            onSeleccionar={(item) => {
              setClienteId(item?.id ?? null);
              setAutoId(null);
            }}
            placeholder="Buscar por nombre, teléfono o patente…"
          />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setCreandoCliente(true)}
          >
            <UserPlus className="h-4 w-4" />
            Registrar cliente nuevo
          </Button>
        </div>
      </Paso>

      {esperandoCliente && (
        <p className="text-sm text-muted-foreground">Cargando el cliente…</p>
      )}

      {cliente && (
        <Paso
          numero={2}
          titulo="Auto"
          elegido={auto ? auto.label : undefined}
          onCambiar={() => setAutoId(null)}
        >
          <div className="space-y-2">
            {cliente.autos.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAutoId(a.id)}
                className="flex w-full items-center gap-2 rounded-xl border p-3 text-left transition-transform duration-100 hover:bg-accent active:scale-[0.99]"
              >
                <Car className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{a.label}</span>
                {a.deVinculado && <Badge variant="info">de {a.deVinculado}</Badge>}
              </button>
            ))}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setCreandoAuto(true)}
            >
              <Plus className="h-4 w-4" />
              Agregar otro auto
            </Button>
          </div>
        </Paso>
      )}

      {cliente && auto && (
        <Paso numero={3} titulo="Servicio">
          <div className="space-y-2">
            {principales.map((s) => {
              const activo = servicioId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setServicioId(s.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl border p-3 text-left transition-[transform,background-color,border-color] duration-100 active:scale-[0.99] ${
                    activo
                      ? "border-primary bg-primary/5 font-medium"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{s.nombre}</span>
                  <span className="shrink-0 tabular-nums">
                    {formatARS(precioDe(s, auto.tipoVehiculo))}
                  </span>
                </button>
              );
            })}
          </div>
        </Paso>
      )}

      {servicio && auto && addons.length > 0 && (
        <section className="space-y-3">
          <h2 className="etiqueta">Adicionales</h2>
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
                  className={`rounded-full border px-3 py-1.5 text-sm transition-[transform,background-color,color] duration-100 active:scale-95 ${
                    activo
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {a.nombre} · {formatARS(precioDe(a, auto.tipoVehiculo))}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      {/* Barra fija: el total y la confirmación siempre a la vista */}
      {servicio && (
        <div className="sticky bottom-20 z-10 space-y-3 rounded-2xl border bg-background p-4 shadow-elevada lg:bottom-4">
          <div className="flex items-baseline justify-between">
            <span className="etiqueta text-muted-foreground">Total</span>
            <span className="dato-lg">{formatARS(total)}</span>
          </div>
          <Button
            className="h-12 w-full text-base"
            disabled={enviando}
            onClick={registrar}
          >
            {enviando ? "Registrando…" : "Registrar llegada"}
          </Button>
        </div>
      )}

      <Dialog open={creandoCliente} onOpenChange={setCreandoCliente}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
          </DialogHeader>
          <ClienteForm
            action={crearCliente}
            submitLabel="Crear y seguir"
            candidatosVinculo={opciones}
            onDone={(id) => {
              setCreandoCliente(false);
              if (id) setClienteId(id);
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      {creandoAuto && cliente && (
        <DialogoAuto clienteId={cliente.id} onCerrar={() => setCreandoAuto(false)} />
      )}
    </div>
  );
}
