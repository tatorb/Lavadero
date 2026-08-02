"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Car,
  Flame,
  Link2,
  Link2Off,
  Pencil,
  Plus,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

import { formatARS, formatFecha } from "@/lib/format";
import {
  crearAuto,
  desvincularCliente,
  editarAuto,
  editarCliente,
  vincularClientes,
  type EstadoAccion,
} from "@/server/actions/clientes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ClienteForm } from "../clientes-table";
import { ESTADO_TURNO_BADGE } from "@/components/turnos/estado";

interface AutoItem {
  id: string;
  marca: string;
  modelo: string;
  patente: string;
  color: string | null;
  detalles: string | null;
}

function AutoForm({
  action,
  defaults,
  onDone,
}: {
  action: (prev: EstadoAccion, formData: FormData) => Promise<EstadoAccion>;
  defaults?: Partial<AutoItem>;
  onDone: () => void;
}) {
  const [state, formAction, pending] = React.useActionState(
    async (prev: EstadoAccion, formData: FormData) => {
      const result = await action(prev, formData);
      if (result?.ok) {
        toast.success("Auto guardado");
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
          <Label htmlFor="marca">Marca</Label>
          <Input id="marca" name="marca" defaultValue={defaults?.marca} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="modelo">Modelo</Label>
          <Input id="modelo" name="modelo" defaultValue={defaults?.modelo} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="patente">Patente</Label>
          <Input id="patente" name="patente" defaultValue={defaults?.patente} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="color">Color</Label>
          <Input id="color" name="color" defaultValue={defaults?.color ?? ""} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="detalles">Detalles</Label>
        <Textarea id="detalles" name="detalles" defaultValue={defaults?.detalles ?? ""} />
      </div>
      {state?.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}

export function ClienteDetalle({
  cliente,
  autos,
  lavados,
  turnos,
  nivel,
  candidatosVinculo,
}: {
  cliente: {
    id: string;
    nombre: string;
    apellido: string | null;
    telefono: string | null;
    email: string | null;
    detalles: string | null;
    conCuenta: boolean;
    puntosTotal: number;
    rachaActual: number;
    mejorRacha: number;
    ultimaVisita: string | null;
    vinculadoCon: { id: string; nombre: string } | null;
  };
  autos: AutoItem[];
  lavados: Array<{
    id: string;
    fecha: string;
    servicio: string;
    auto: string;
    finalizado: boolean;
    puntos: number;
    precio: number | null;
  }>;
  turnos: Array<{
    id: string;
    fecha: string;
    servicio: string;
    auto: string | null;
    estado: "PENDIENTE" | "CONFIRMADO" | "CANCELADO" | "COMPLETADO";
  }>;
  nivel: {
    actual: string;
    color: string | null;
    siguiente: string | null;
    progreso: number;
    puntosParaSiguiente: number;
  };
  candidatosVinculo: Array<{ id: string; nombre: string }>;
}) {
  const router = useRouter();
  const [editando, setEditando] = React.useState(false);
  const [agregandoAuto, setAgregandoAuto] = React.useState(false);
  const [editandoAuto, setEditandoAuto] = React.useState<AutoItem | null>(null);
  const [vinculando, setVinculando] = React.useState(false);
  const [vinculoSeleccion, setVinculoSeleccion] = React.useState("");

  const nombreCompleto = [cliente.nombre, cliente.apellido].filter(Boolean).join(" ");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/clientes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{nombreCompleto}</h1>
          <p className="text-sm text-muted-foreground">
            {cliente.telefono ?? "Sin teléfono"} · {cliente.email ?? "Sin email"}
            {cliente.conCuenta && (
              <Badge variant="success" className="ml-2">
                Usa la app
              </Badge>
            )}
          </p>
        </div>
        <Dialog open={editando} onOpenChange={setEditando}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar cliente</DialogTitle>
            </DialogHeader>
            <ClienteForm
              action={editarCliente.bind(null, cliente.id)}
              defaults={cliente}
              submitLabel="Guardar cambios"
              onDone={() => setEditando(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Trophy className="h-4 w-4" /> Nivel y puntos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span
                className="text-xl font-bold"
                style={nivel.color ? { color: nivel.color } : undefined}
              >
                {nivel.actual}
              </span>
              <span className="text-sm text-muted-foreground">
                {cliente.puntosTotal} pts
              </span>
            </div>
            {nivel.siguiente && (
              <>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.round(nivel.progreso * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {nivel.puntosParaSiguiente} pts para {nivel.siguiente}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Flame className="h-4 w-4" /> Racha de visitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{cliente.rachaActual}</p>
            <p className="text-xs text-muted-foreground">
              Mejor racha: {cliente.mejorRacha} · Última visita:{" "}
              {cliente.ultimaVisita
                ? formatFecha(new Date(cliente.ultimaVisita), "dd/MM/yyyy")
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link2 className="h-4 w-4" /> Vínculo (pareja/familiar)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cliente.vinculadoCon ? (
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/admin/clientes/${cliente.vinculadoCon.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {cliente.vinculadoCon.nombre}
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const r = await desvincularCliente(cliente.id);
                    if (r?.error) toast.error(r.error);
                    else {
                      toast.success("Clientes desvinculados");
                      router.refresh();
                    }
                  }}
                >
                  <Link2Off className="h-4 w-4" />
                  Desvincular
                </Button>
              </div>
            ) : (
              <Dialog open={vinculando} onOpenChange={setVinculando}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Link2 className="h-4 w-4" />
                    Vincular con otro cliente
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Vincular cliente</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">
                    Los clientes vinculados comparten autos y beneficios de nivel.
                  </p>
                  <Select value={vinculoSeleccion} onValueChange={setVinculoSeleccion}>
                    <SelectTrigger>
                      <SelectValue placeholder="Elegí un cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {candidatosVinculo.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    disabled={!vinculoSeleccion}
                    onClick={async () => {
                      const r = await vincularClientes(cliente.id, vinculoSeleccion);
                      if (r?.error) toast.error(r.error);
                      else {
                        toast.success("Clientes vinculados");
                        setVinculando(false);
                        router.refresh();
                      }
                    }}
                  >
                    Vincular
                  </Button>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="autos">
        <TabsList>
          <TabsTrigger value="autos">Autos ({autos.length})</TabsTrigger>
          <TabsTrigger value="lavados">Lavados ({lavados.length})</TabsTrigger>
          <TabsTrigger value="turnos">Turnos ({turnos.length})</TabsTrigger>
          <TabsTrigger value="info">Detalles</TabsTrigger>
        </TabsList>

        <TabsContent value="autos" className="space-y-3">
          <div className="flex justify-end">
            <Dialog open={agregandoAuto} onOpenChange={setAgregandoAuto}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  Agregar auto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo auto</DialogTitle>
                </DialogHeader>
                <AutoForm
                  action={crearAuto.bind(null, cliente.id)}
                  onDone={() => setAgregandoAuto(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {autos.map((auto) => (
              <Card key={auto.id}>
                <CardContent className="flex items-start justify-between gap-2 pt-6">
                  <div className="flex items-start gap-3">
                    <Car className="mt-1 h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {auto.marca} {auto.modelo}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {auto.patente}
                        {auto.color ? ` · ${auto.color}` : ""}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setEditandoAuto(auto)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            {autos.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin autos cargados.</p>
            )}
          </div>
          <Dialog
            open={!!editandoAuto}
            onOpenChange={(open) => !open && setEditandoAuto(null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar auto</DialogTitle>
              </DialogHeader>
              {editandoAuto && (
                <AutoForm
                  action={editarAuto.bind(null, editandoAuto.id)}
                  defaults={editandoAuto}
                  onDone={() => setEditandoAuto(null)}
                />
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="lavados">
          <div className="rounded-lg border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Auto</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Puntos</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lavados.map((l) => (
                  <TableRow
                    key={l.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/admin/lavados/${l.id}`)}
                  >
                    <TableCell>{formatFecha(new Date(l.fecha))}</TableCell>
                    <TableCell>{l.servicio}</TableCell>
                    <TableCell>{l.auto}</TableCell>
                    <TableCell>{l.precio != null ? formatARS(l.precio) : "—"}</TableCell>
                    <TableCell>{l.puntos || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={l.finalizado ? "success" : "warning"}>
                        {l.finalizado ? "Finalizado" : "En curso"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {lavados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                      Sin lavados registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="turnos">
          <div className="rounded-lg border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Auto</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {turnos.map((t) => {
                  const badge = ESTADO_TURNO_BADGE[t.estado];
                  return (
                    <TableRow key={t.id}>
                      <TableCell>{formatFecha(new Date(t.fecha))}</TableCell>
                      <TableCell>{t.servicio}</TableCell>
                      <TableCell>{t.auto ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {turnos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                      Sin turnos registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="info">
          <Card>
            <CardContent className="pt-6">
              <p className="whitespace-pre-wrap text-sm">
                {cliente.detalles || "Sin detalles cargados."}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
