"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { Eye, EyeOff, Link2, Merge, Plus } from "lucide-react";
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
  activo: boolean;
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

export function ClientesTable({
  clientes,
  verArchivados,
}: {
  clientes: ClienteRow[];
  verArchivados: boolean;
}) {
  const router = useRouter();
  const [creando, setCreando] = React.useState(false);

  const columns: ColumnDef<ClienteRow>[] = [
    {
      accessorKey: "nombre",
      header: "Nombre",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span>{row.original.nombre}</span>
          {!row.original.activo && <Badge variant="muted">Archivado</Badge>}
        </div>
      ),
    },
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
        <div className="flex flex-1 items-center gap-2 sm:flex-none">
        <Button variant="outline" asChild>
          <Link href="/admin/clientes/fusionar">
            <Merge className="h-4 w-4" />
            Fusionar
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/clientes/vinculos">
            <Link2 className="h-4 w-4" />
            Vínculos
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          asChild
          title={verArchivados ? "Ocultar archivados" : "Ver archivados"}
        >
          <Link
            href={verArchivados ? "/admin/clientes" : "/admin/clientes?archivados=1"}
            aria-label={verArchivados ? "Ocultar archivados" : "Ver archivados"}
          >
            {verArchivados ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Link>
        </Button>
        <Dialog open={creando} onOpenChange={setCreando}>
          <DialogTrigger asChild>
            <Button className="ml-auto sm:ml-0">
              <Plus className="h-4 w-4" />
              Nuevo
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
        </div>
      }
    />
  );
}
