"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import {
  crearUsuario,
  toggleUsuario,
  type EstadoAccion,
} from "@/server/actions/lavaderos";
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
import { DataTable } from "@/components/admin/data-table";

interface UsuarioRow {
  id: string;
  nombre: string;
  email: string;
  rol: "SUPER_ADMIN" | "ADMIN" | "OPERATIVO";
  lavadero: string | null;
  activo: boolean;
  esYo: boolean;
}

const ROL_LABEL: Record<UsuarioRow["rol"], string> = {
  SUPER_ADMIN: "Super admin",
  ADMIN: "Admin",
  OPERATIVO: "Operativo",
};

function UsuarioForm({
  lavaderos,
  onDone,
}: {
  lavaderos: Array<{ id: string; nombre: string }>;
  onDone: () => void;
}) {
  const [rol, setRol] = React.useState<UsuarioRow["rol"]>("ADMIN");
  const [state, formAction, pending] = React.useActionState(
    async (prev: EstadoAccion, formData: FormData) => {
      const result = await crearUsuario(prev, formData);
      if (result?.ok) {
        toast.success("Usuario creado");
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
        <Input id="nombre" name="nombre" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" name="password" type="password" minLength={8} required />
      </div>
      <div className="space-y-2">
        <Label>Rol</Label>
        <Select name="rol" value={rol} onValueChange={(v) => setRol(v as UsuarioRow["rol"])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">Admin de lavadero</SelectItem>
            <SelectItem value="OPERATIVO">Operativo</SelectItem>
            <SelectItem value="SUPER_ADMIN">Super admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {rol !== "SUPER_ADMIN" && (
        <div className="space-y-2">
          <Label>Lavadero</Label>
          <Select name="lavaderoId">
            <SelectTrigger>
              <SelectValue placeholder="Elegí el lavadero" />
            </SelectTrigger>
            <SelectContent>
              {lavaderos.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {state?.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creando…" : "Crear usuario"}
      </Button>
    </form>
  );
}

export function UsuariosTable({
  usuarios,
  lavaderos,
}: {
  usuarios: UsuarioRow[];
  lavaderos: Array<{ id: string; nombre: string }>;
}) {
  const [creando, setCreando] = React.useState(false);

  const columns: ColumnDef<UsuarioRow>[] = [
    { accessorKey: "nombre", header: "Nombre" },
    { accessorKey: "email", header: "Email" },
    {
      accessorKey: "rol",
      header: "Rol",
      cell: ({ row }) => (
        <Badge variant={row.original.rol === "SUPER_ADMIN" ? "default" : "secondary"}>
          {ROL_LABEL[row.original.rol]}
        </Badge>
      ),
    },
    {
      accessorKey: "lavadero",
      header: "Lavadero",
      cell: ({ row }) => row.original.lavadero ?? "—",
    },
    {
      accessorKey: "activo",
      header: "Activo",
      cell: ({ row }) =>
        row.original.esYo ? (
          <Badge variant="muted">Vos</Badge>
        ) : (
          <Switch
            checked={row.original.activo}
            onCheckedChange={async () => {
              const r = await toggleUsuario(row.original.id);
              if (r?.error) toast.error(r.error);
            }}
          />
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={usuarios}
      searchPlaceholder="Buscar usuario…"
      toolbar={
        <Dialog open={creando} onOpenChange={setCreando}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Nuevo usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo usuario</DialogTitle>
            </DialogHeader>
            <UsuarioForm lavaderos={lavaderos} onDone={() => setCreando(false)} />
          </DialogContent>
        </Dialog>
      }
    />
  );
}
