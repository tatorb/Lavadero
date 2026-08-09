"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowDownCircle, ArrowUpCircle, Plus, Trash2, Wallet, Waves } from "lucide-react";
import { toast } from "sonner";

import { CATEGORIAS_CAJA } from "@/lib/caja";
import { FORMA_PAGO_LABEL, formatARS, formatFecha } from "@/lib/format";
import {
  crearMovimientoCaja,
  eliminarMovimientoCaja,
  type EstadoAccion,
} from "@/server/actions/caja";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardMetrica } from "@/components/admin/card-metrica";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/admin/data-table";

interface MovimientoRow {
  id: string;
  fecha: string;
  tipo: "INGRESO" | "EGRESO";
  categoria: string;
  concepto: string;
  importe: number;
  formaPago: string;
  observaciones: string | null;
  importado: boolean;
}

function MovimientoForm({ onDone }: { onDone: () => void }) {
  const [state, formAction, pending] = React.useActionState(
    async (prev: EstadoAccion, formData: FormData) => {
      const result = await crearMovimientoCaja(prev, formData);
      if (result?.ok) {
        toast.success("Movimiento registrado");
        onDone();
      }
      return result;
    },
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="fecha">Fecha</Label>
          <Input
            id="fecha"
            name="fecha"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select name="tipo" defaultValue="EGRESO">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EGRESO">Egreso (gasto)</SelectItem>
              <SelectItem value="INGRESO">Ingreso extraordinario</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Categoría</Label>
          <Select name="categoria" defaultValue="Productos">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS_CAJA.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="importe">Importe (ARS)</Label>
          <Input id="importe" name="importe" type="number" min={0} step="0.01" required />
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="concepto">Concepto</Label>
          <Input id="concepto" name="concepto" placeholder="Ej: compra de shampoo" required />
        </div>
        <div className="space-y-2">
          <Label>Forma de pago</Label>
          <Select name="formaPago" defaultValue="EFECTIVO">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EFECTIVO">Efectivo</SelectItem>
              <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
              <SelectItem value="MIXTO">Mixto</SelectItem>
              <SelectItem value="OTRO">Otro</SelectItem>
              <SelectItem value="SIN_DATO">Sin dato</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="observaciones">Observaciones</Label>
        <Textarea id="observaciones" name="observaciones" />
      </div>
      {state?.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Guardando…" : "Registrar movimiento"}
      </Button>
    </form>
  );
}

export function CajaContenido({
  mesLabel,
  resumen,
  movimientos,
  puedeEliminar,
}: {
  mesLabel: string;
  resumen: {
    ingresosLavados: number;
    cantidadLavados: number;
    ingresosExtra: number;
    egresos: number;
    neto: number;
  };
  movimientos: MovimientoRow[];
  puedeEliminar: boolean;
}) {
  const [creando, setCreando] = React.useState(false);

  const columns: ColumnDef<MovimientoRow>[] = [
    {
      accessorKey: "fecha",
      header: "Fecha",
      cell: ({ row }) => formatFecha(new Date(row.original.fecha), "dd/MM/yyyy"),
    },
    {
      accessorKey: "tipo",
      header: "Tipo",
      cell: ({ row }) =>
        row.original.tipo === "INGRESO" ? (
          <Badge variant="success">Ingreso</Badge>
        ) : (
          <Badge variant="warning">Egreso</Badge>
        ),
    },
    { accessorKey: "categoria", header: "Categoría" },
    {
      accessorKey: "concepto",
      header: "Concepto",
      cell: ({ row }) => (
        <div className="max-w-56 truncate" title={row.original.observaciones ?? undefined}>
          {row.original.concepto}
          {row.original.importado && (
            <Badge variant="muted" className="ml-1">
              Importado
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "importe",
      header: "Importe",
      cell: ({ row }) => (
        <span
          className={
            row.original.tipo === "INGRESO" ? "text-emerald-700" : "text-destructive"
          }
        >
          {row.original.tipo === "INGRESO" ? "+" : "−"}
          {formatARS(row.original.importe)}
        </span>
      ),
    },
    {
      accessorKey: "formaPago",
      header: "Forma",
      cell: ({ row }) => FORMA_PAGO_LABEL[row.original.formaPago] ?? row.original.formaPago,
    },
    ...(puedeEliminar
      ? [
          {
            id: "acciones",
            header: "",
            cell: ({ row }) => (
              <Button
                variant="ghost"
                size="icon"
                onClick={async (e) => {
                  e.stopPropagation();
                  const r = await eliminarMovimientoCaja(row.original.id);
                  if (r?.error) toast.error(r.error);
                  else toast.success("Movimiento eliminado");
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            ),
          } satisfies ColumnDef<MovimientoRow>,
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Caja</h1>
        <p className="text-sm text-muted-foreground">
          Ingresos, gastos y resultado del mes {mesLabel}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CardMetrica
          icono={<Waves />}
          valor={formatARS(resumen.ingresosLavados)}
          etiqueta="Cobrado por lavados"
          detalle={`${resumen.cantidadLavados} lavados cobrados este mes`}
        />
        <CardMetrica
          icono={<ArrowUpCircle />}
          valor={formatARS(resumen.ingresosExtra)}
          etiqueta="Otros ingresos"
        />
        <CardMetrica
          icono={<ArrowDownCircle />}
          valor={formatARS(resumen.egresos)}
          etiqueta="Gastos"
          tono="negativo"
        />
        <CardMetrica
          icono={<Wallet />}
          valor={formatARS(resumen.neto)}
          etiqueta="Resultado del mes"
          tono={resumen.neto >= 0 ? "positivo" : "negativo"}
          className="shadow-elevada"
        />
      </div>

      <DataTable
        columns={columns}
        data={movimientos}
        searchPlaceholder="Buscar por concepto o categoría…"
        emptyMessage="Sin movimientos de caja registrados."
        toolbar={
          <Dialog open={creando} onOpenChange={setCreando}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Nuevo movimiento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo movimiento de caja</DialogTitle>
              </DialogHeader>
              <MovimientoForm onDone={() => setCreando(false)} />
            </DialogContent>
          </Dialog>
        }
      />
    </div>
  );
}
