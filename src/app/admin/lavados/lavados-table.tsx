"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { formatARS, formatFecha } from "@/lib/format";
import { crearLavado } from "@/server/actions/lavados";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/admin/data-table";

interface LavadoRow {
  id: string;
  fecha: string;
  cliente: string;
  auto: string;
  servicio: string;
  precio: number | null;
  estado: "en_espera" | "en_curso" | "finalizado";
}

export interface ClienteConAutos {
  id: string;
  nombre: string;
  autos: Array<{ id: string; label: string }>;
}

export interface ServicioOption {
  id: string;
  nombre: string;
  precio: number;
  tipo: "PRINCIPAL" | "ADDON";
}

const ESTADO_LAVADO: Record<LavadoRow["estado"], { label: string; variant: "warning" | "info" | "success" }> = {
  en_espera: { label: "En espera", variant: "warning" },
  en_curso: { label: "En curso", variant: "info" },
  finalizado: { label: "Finalizado", variant: "success" },
};

export function NuevoLavadoForm({
  clientes,
  servicios,
  turnoId,
  clientePreseleccionado,
  onDone,
}: {
  clientes: ClienteConAutos[];
  servicios: ServicioOption[];
  turnoId?: string;
  clientePreseleccionado?: string;
  onDone: (id?: string) => void;
}) {
  const [clienteId, setClienteId] = React.useState(clientePreseleccionado ?? "");
  const [autoId, setAutoId] = React.useState("");
  const [servicioId, setServicioId] = React.useState("");
  const [addonIds, setAddonIds] = React.useState<string[]>([]);
  const [detalles, setDetalles] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const cliente = clientes.find((c) => c.id === clienteId);
  const principales = servicios.filter((s) => s.tipo === "PRINCIPAL");
  const addons = servicios.filter((s) => s.tipo === "ADDON");

  const total =
    (servicios.find((s) => s.id === servicioId)?.precio ?? 0) +
    addonIds.reduce((sum, id) => sum + (servicios.find((s) => s.id === id)?.precio ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Cliente</Label>
        <Select
          value={clienteId}
          onValueChange={(v) => {
            setClienteId(v);
            setAutoId("");
          }}
          disabled={!!clientePreseleccionado}
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
        <Label>Auto</Label>
        <Select value={autoId} onValueChange={setAutoId} disabled={!cliente}>
          <SelectTrigger>
            <SelectValue placeholder={cliente ? "Elegí el auto" : "Primero elegí un cliente"} />
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
                {s.nombre} — {formatARS(s.precio)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {addons.length > 0 && (
        <div className="space-y-2">
          <Label>Adicionales</Label>
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
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    activo
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {a.nombre} · {formatARS(a.precio)}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="detalles">Detalles</Label>
        <Textarea
          id="detalles"
          value={detalles}
          onChange={(e) => setDetalles(e.target.value)}
          placeholder="Observaciones del vehículo, pedidos especiales…"
        />
      </div>
      <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
        <span className="text-muted-foreground">Total estimado</span>
        <span className="font-semibold">{formatARS(total)}</span>
      </div>
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      <Button
        className="w-full"
        disabled={pending || !clienteId || !autoId || !servicioId}
        onClick={async () => {
          setPending(true);
          setError(null);
          const r = await crearLavado({
            clienteId,
            autoId,
            servicioId,
            addonIds,
            detalles: detalles || undefined,
            turnoId,
          });
          setPending(false);
          if (r?.error) setError(r.error);
          else {
            toast.success("Llegada registrada");
            onDone(r?.id);
          }
        }}
      >
        {pending ? "Registrando…" : "Registrar llegada"}
      </Button>
    </div>
  );
}

export function LavadosTable({
  lavados,
  clientes,
  servicios,
}: {
  lavados: LavadoRow[];
  clientes: ClienteConAutos[];
  servicios: ServicioOption[];
}) {
  const router = useRouter();
  const [creando, setCreando] = React.useState(false);

  const columns: ColumnDef<LavadoRow>[] = [
    {
      accessorKey: "fecha",
      header: "Llegada",
      cell: ({ row }) => formatFecha(new Date(row.original.fecha)),
    },
    { accessorKey: "cliente", header: "Cliente" },
    { accessorKey: "auto", header: "Auto" },
    { accessorKey: "servicio", header: "Servicio" },
    {
      accessorKey: "precio",
      header: "Precio",
      cell: ({ row }) =>
        row.original.precio != null ? formatARS(row.original.precio) : "—",
    },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: ({ row }) => {
        const e = ESTADO_LAVADO[row.original.estado];
        return <Badge variant={e.variant}>{e.label}</Badge>;
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={lavados}
      searchPlaceholder="Buscar por cliente, auto o servicio…"
      emptyMessage="Todavía no hay lavados registrados."
      onRowClick={(row) => router.push(`/admin/lavados/${row.id}`)}
      toolbar={
        <Dialog open={creando} onOpenChange={setCreando}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Registrar llegada
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar llegada</DialogTitle>
            </DialogHeader>
            <NuevoLavadoForm
              clientes={clientes}
              servicios={servicios}
              onDone={(id) => {
                setCreando(false);
                if (id) router.push(`/admin/lavados/${id}`);
              }}
            />
          </DialogContent>
        </Dialog>
      }
    />
  );
}
