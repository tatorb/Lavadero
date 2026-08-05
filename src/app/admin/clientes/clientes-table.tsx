"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { crearCliente, type EstadoAccion } from "@/server/actions/clientes";
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
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/admin/data-table";

interface ClienteRow {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  autos: number;
  lavados: number;
  puntos: number;
  conCuenta: boolean;
}

export function ClienteForm({
  action,
  defaults,
  submitLabel,
  onDone,
}: {
  action: (prev: EstadoAccion, formData: FormData) => Promise<EstadoAccion>;
  defaults?: Partial<{
    nombre: string;
    apellido: string | null;
    telefono: string | null;
    email: string | null;
    tipoRelacion: string;
    origen: string | null;
    detalles: string | null;
  }>;
  submitLabel: string;
  onDone: (id?: string) => void;
}) {
  const [state, formAction, pending] = React.useActionState(
    async (prev: EstadoAccion, formData: FormData) => {
      const result = await action(prev, formData);
      if (result?.ok) {
        toast.success("Guardado");
        onDone(result.id);
      }
      return result;
    },
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" name="nombre" defaultValue={defaults?.nombre} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="apellido">Apellido</Label>
          <Input id="apellido" name="apellido" defaultValue={defaults?.apellido ?? ""} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="telefono">Teléfono</Label>
        <Input id="telefono" name="telefono" defaultValue={defaults?.telefono ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={defaults?.email ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Relación</Label>
          <Select name="tipoRelacion" defaultValue={defaults?.tipoRelacion ?? "CLIENTE"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CLIENTE">Cliente</SelectItem>
              <SelectItem value="AMIGO">Amigo</SelectItem>
              <SelectItem value="FAMILIAR">Familiar</SelectItem>
              <SelectItem value="DESCONOCIDO">Desconocido</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="origen">¿Cómo llegó?</Label>
          <Input
            id="origen"
            name="origen"
            placeholder="De pasada, pauta, boca en boca…"
            defaultValue={defaults?.origen ?? ""}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="detalles">Detalles</Label>
        <Textarea id="detalles" name="detalles" defaultValue={defaults?.detalles ?? ""} />
      </div>
      {state?.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}

export function ClientesTable({ clientes }: { clientes: ClienteRow[] }) {
  const router = useRouter();
  const [creando, setCreando] = React.useState(false);

  const columns: ColumnDef<ClienteRow>[] = [
    { accessorKey: "nombre", header: "Nombre" },
    { accessorKey: "telefono", header: "Teléfono" },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span>{row.original.email ?? "—"}</span>
          {row.original.conCuenta && <Badge variant="success">App</Badge>}
        </div>
      ),
    },
    { accessorKey: "autos", header: "Autos" },
    { accessorKey: "lavados", header: "Lavados" },
    { accessorKey: "puntos", header: "Puntos" },
  ];

  return (
    <DataTable
      columns={columns}
      data={clientes}
      searchPlaceholder="Buscar por nombre, teléfono o email…"
      emptyMessage="Todavía no hay clientes cargados."
      onRowClick={(row) => router.push(`/admin/clientes/${row.id}`)}
      toolbar={
        <Dialog open={creando} onOpenChange={setCreando}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Nuevo cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo cliente</DialogTitle>
            </DialogHeader>
            <ClienteForm
              action={crearCliente}
              submitLabel="Crear cliente"
              onDone={(id) => {
                setCreando(false);
                if (id) router.push(`/admin/clientes/${id}`);
              }}
            />
          </DialogContent>
        </Dialog>
      }
    />
  );
}
