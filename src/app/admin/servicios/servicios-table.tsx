"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { formatARS } from "@/lib/format";
import {
  crearServicio,
  editarServicio,
  toggleServicioActivo,
  type EstadoServicio,
} from "@/server/actions/servicios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/admin/data-table";

export interface ServicioRow {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  precios: Partial<Record<string, number>>;
  tipo: "PRINCIPAL" | "ADDON";
  duracionMin: number;
  puntos: number;
  activo: boolean;
}

const TIPOS_VEHICULO = [
  ["AUTO", "Auto"],
  ["SUV", "SUV"],
  ["PICKUP", "Pickup"],
  ["PICKUP_GRANDE", "Pickup grande"],
  ["UTILITARIO", "Utilitario"],
  ["UTILITARIO_GRANDE", "Utilitario grande"],
  ["MOTO", "Moto"],
  ["MOTORHOME", "Motorhome"],
  ["UTV", "UTV"],
  ["OTRO", "Otro"],
] as const;

function ServicioForm({
  servicio,
  onDone,
}: {
  servicio?: ServicioRow;
  onDone: () => void;
}) {
  const action = servicio ? editarServicio.bind(null, servicio.id) : crearServicio;
  const [state, formAction, pending] = React.useActionState(
    async (prev: EstadoServicio, formData: FormData) => {
      const result = await action(prev, formData);
      if (result?.ok) {
        toast.success(servicio ? "Servicio actualizado" : "Servicio creado");
        onDone();
      }
      return result;
    },
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" name="nombre" defaultValue={servicio?.nombre} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="descripcion">Descripción</Label>
        <Textarea
          id="descripcion"
          name="descripcion"
          defaultValue={servicio?.descripcion ?? ""}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="precio">Precio (ARS)</Label>
          <Input
            id="precio"
            name="precio"
            type="number"
            min={0}
            step="0.01"
            defaultValue={servicio?.precio}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select name="tipo" defaultValue={servicio?.tipo ?? "PRINCIPAL"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PRINCIPAL">Principal</SelectItem>
              <SelectItem value="ADDON">Adicional</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="duracionMin">Duración (min)</Label>
          <Input
            id="duracionMin"
            name="duracionMin"
            type="number"
            min={5}
            step={5}
            defaultValue={servicio?.duracionMin ?? 30}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="puntos">Puntos que otorga</Label>
          <Input
            id="puntos"
            name="puntos"
            type="number"
            min={0}
            defaultValue={servicio?.puntos ?? 10}
            required
          />
        </div>
      </div>
      <details className="rounded-md border px-3 py-2" open={servicio && Object.keys(servicio.precios).length > 0}>
        <summary className="cursor-pointer text-sm font-medium">
          Precios por tipo de vehículo (opcional)
        </summary>
        <p className="mt-1 text-xs text-muted-foreground">
          Si un tipo no tiene precio, se usa el precio base del servicio.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {TIPOS_VEHICULO.map(([valor, label]) => (
            <div key={valor} className="space-y-1">
              <Label htmlFor={`precio_${valor}`} className="text-xs">
                {label}
              </Label>
              <Input
                id={`precio_${valor}`}
                name={`precio_${valor}`}
                type="number"
                min={0}
                step="0.01"
                placeholder="Precio base"
                defaultValue={servicio?.precios[valor] ?? ""}
              />
            </div>
          ))}
        </div>
      </details>
      {state?.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Guardando…" : servicio ? "Guardar cambios" : "Crear servicio"}
      </Button>
    </form>
  );
}

export function ServiciosTable({
  servicios,
  puedeEditar,
}: {
  servicios: ServicioRow[];
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = React.useState<ServicioRow | null>(null);
  const [creando, setCreando] = React.useState(false);

  // revalidatePath limpia la caché del servidor, pero el cliente sigue
  // mostrando el payload viejo hasta que se le pide refrescar
  const refrescar = () => router.refresh();

  const columns: ColumnDef<ServicioRow>[] = [
    { accessorKey: "nombre", header: "Nombre" },
    {
      accessorKey: "tipo",
      header: "Tipo",
      cell: ({ row }) => (
        <Badge variant={row.original.tipo === "PRINCIPAL" ? "info" : "muted"}>
          {row.original.tipo === "PRINCIPAL" ? "Principal" : "Adicional"}
        </Badge>
      ),
    },
    {
      accessorKey: "precio",
      header: "Precio",
      cell: ({ row }) => {
        const cantVariantes = Object.keys(row.original.precios).length;
        return (
          <div>
            {formatARS(row.original.precio)}
            {cantVariantes > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">
                +{cantVariantes} por tipo
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "duracionMin",
      header: "Duración",
      cell: ({ row }) => `${row.original.duracionMin} min`,
    },
    { accessorKey: "puntos", header: "Puntos" },
    {
      accessorKey: "activo",
      header: "Estado",
      cell: ({ row }) =>
        puedeEditar ? (
          <Switch
            checked={row.original.activo}
            onCheckedChange={async () => {
              await toggleServicioActivo(row.original.id);
              refrescar();
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <Badge variant={row.original.activo ? "success" : "muted"}>
            {row.original.activo ? "Activo" : "Inactivo"}
          </Badge>
        ),
    },
    ...(puedeEditar
      ? [
          {
            id: "acciones",
            header: "",
            cell: ({ row }) => (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditando(row.original);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            ),
          } satisfies ColumnDef<ServicioRow>,
        ]
      : []),
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={servicios}
        pageSize={100}
      searchPlaceholder="Buscar servicio…"
        emptyMessage="Todavía no hay servicios cargados."
        toolbar={
          puedeEditar ? (
            <Dialog open={creando} onOpenChange={setCreando}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  Nuevo servicio
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo servicio</DialogTitle>
                </DialogHeader>
                <ServicioForm
                  onDone={() => {
                    setCreando(false);
                    refrescar();
                  }}
                />
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />
      <Dialog open={!!editando} onOpenChange={(open) => !open && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar servicio</DialogTitle>
          </DialogHeader>
          {editando && (
            <ServicioForm
              servicio={editando}
              onDone={() => {
                setEditando(null);
                refrescar();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
