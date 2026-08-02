"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  crearLavadero,
  editarLavadero,
  toggleLavadero,
  type EstadoAccion,
} from "@/server/actions/lavaderos";
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
import { Switch } from "@/components/ui/switch";
import { DataTable } from "@/components/admin/data-table";

interface LavaderoRow {
  id: string;
  nombre: string;
  slug: string;
  direccion: string | null;
  telefono: string | null;
  activo: boolean;
  clientes: number;
  usuarios: number;
  lavados: number;
}

function LavaderoForm({
  lavadero,
  onDone,
}: {
  lavadero?: LavaderoRow;
  onDone: () => void;
}) {
  const action = lavadero ? editarLavadero.bind(null, lavadero.id) : crearLavadero;
  const [state, formAction, pending] = React.useActionState(
    async (prev: EstadoAccion, formData: FormData) => {
      const result = await action(prev, formData);
      if (result?.ok) {
        toast.success("Lavadero guardado");
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
        <Input id="nombre" name="nombre" defaultValue={lavadero?.nombre} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">Identificador (slug)</Label>
        <Input
          id="slug"
          name="slug"
          defaultValue={lavadero?.slug}
          placeholder="mi-lavadero"
          pattern="[a-z0-9-]+"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="direccion">Dirección</Label>
        <Input id="direccion" name="direccion" defaultValue={lavadero?.direccion ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="telefono">Teléfono</Label>
        <Input id="telefono" name="telefono" defaultValue={lavadero?.telefono ?? ""} />
      </div>
      {state?.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
      {!lavadero && (
        <p className="text-xs text-muted-foreground">
          El lavadero se crea con los niveles Bronce/Plata/Oro por defecto.
        </p>
      )}
    </form>
  );
}

export function LavaderosTable({ lavaderos }: { lavaderos: LavaderoRow[] }) {
  const [creando, setCreando] = React.useState(false);
  const [editando, setEditando] = React.useState<LavaderoRow | null>(null);

  const columns: ColumnDef<LavaderoRow>[] = [
    { accessorKey: "nombre", header: "Nombre" },
    { accessorKey: "slug", header: "Slug" },
    { accessorKey: "clientes", header: "Clientes" },
    { accessorKey: "usuarios", header: "Usuarios" },
    { accessorKey: "lavados", header: "Lavados" },
    {
      accessorKey: "activo",
      header: "Activo",
      cell: ({ row }) => (
        <Switch
          checked={row.original.activo}
          onCheckedChange={async () => {
            const r = await toggleLavadero(row.original.id);
            if (r?.error) toast.error(r.error);
          }}
        />
      ),
    },
    {
      id: "acciones",
      header: "",
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" onClick={() => setEditando(row.original)}>
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={lavaderos}
        searchPlaceholder="Buscar lavadero…"
        toolbar={
          <Dialog open={creando} onOpenChange={setCreando}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Nuevo lavadero
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo lavadero</DialogTitle>
              </DialogHeader>
              <LavaderoForm onDone={() => setCreando(false)} />
            </DialogContent>
          </Dialog>
        }
      />
      <Dialog open={!!editando} onOpenChange={(open) => !open && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar lavadero</DialogTitle>
          </DialogHeader>
          {editando && (
            <LavaderoForm lavadero={editando} onDone={() => setEditando(null)} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
