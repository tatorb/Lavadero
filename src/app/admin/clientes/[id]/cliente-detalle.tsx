"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Car,
  Flame,
  History,
  Link2,
  Link2Off,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Trophy,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  ESTADO_PAGO_LABEL,
  TIPO_VEHICULO_LABEL,
  formatARS,
  formatFecha,
} from "@/lib/format";
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
import { CuentaTab, type MovimientoCuentaItem } from "./cuenta-tab";
import { ESTADO_TURNO_BADGE } from "@/components/turnos/estado";

interface AutoItem {
  id: string;
  marca: string;
  modelo: string;
  patente: string | null;
  tipo: string;
  color: string | null;
  detalles: string | null;
  descripcionOriginal?: string | null;
  cantidadLavados?: number;
}

const RELACION_LABEL: Record<string, string> = {
  CLIENTE: "Cliente",
  AMIGO: "Amigo",
  FAMILIAR: "Familiar",
  DESCONOCIDO: "Desconocido",
};

const BADGE_PAGO: Record<string, "success" | "warning" | "info" | "muted"> = {
  PAGADO: "success",
  PARCIAL: "warning",
  PENDIENTE: "warning",
  CORTESIA: "info",
  SALDO_APLICADO: "info",
  BONIFICADO: "info",
  SIN_DATO: "muted",
};

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
          <Label htmlFor="patente">Patente (opcional)</Label>
          <Input id="patente" name="patente" defaultValue={defaults?.patente ?? ""} />
        </div>
        <div className="space-y-2">
          <Label>Tipo de vehículo</Label>
          <Select name="tipo" defaultValue={defaults?.tipo ?? "AUTO"}>
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
        <div className="col-span-2 space-y-2">
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
  cuenta,
  resumen,
}: {
  cliente: {
    id: string;
    nombre: string;
    apellido: string | null;
    telefono: string | null;
    email: string | null;
    tipoRelacion: string;
    origen: string | null;
    nombreOriginal: string | null;
    visitasAnotadas: number | null;
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
    autoId: string;
    finalizado: boolean;
    cancelado: boolean;
    puntos: number;
    precio: number | null;
    cobrado: number | null;
    estadoPago: string;
  }>;
  resumen: {
    totalLavados: number;
    totalGastado: number;
    primeraVisita: string | null;
  };
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
  cuenta: {
    saldo: number;
    movimientos: MovimientoCuentaItem[];
    esAdmin: boolean;
  };
}) {
  const router = useRouter();
  const [editando, setEditando] = React.useState(false);
  const [agregandoAuto, setAgregandoAuto] = React.useState(false);
  const [editandoAuto, setEditandoAuto] = React.useState<AutoItem | null>(null);
  const [vinculando, setVinculando] = React.useState(false);
  const [vinculoSeleccion, setVinculoSeleccion] = React.useState("");
  const [tab, setTab] = React.useState("autos");
  const [filtroAuto, setFiltroAuto] = React.useState<string | null>(null);

  const nombreCompleto = [cliente.nombre, cliente.apellido].filter(Boolean).join(" ");
  const lavadosVisibles = filtroAuto
    ? lavados.filter((l) => l.autoId === filtroAuto)
    : lavados;
  const autoFiltrado = autos.find((a) => a.id === filtroAuto);
  const telefonoLimpio = cliente.telefono?.replace(/[^\d+]/g, "");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/clientes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{nombreCompleto}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{cliente.telefono ?? "Sin teléfono"}</span>
            {telefonoLimpio && (
              <>
                <a
                  href={`tel:${telefonoLimpio}`}
                  className="text-primary"
                  aria-label="Llamar"
                >
                  <Phone className="h-4 w-4" />
                </a>
                <a
                  href={`https://wa.me/${telefonoLimpio.replace(/^\+/, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-600"
                  aria-label="WhatsApp"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              </>
            )}
            <span>· {cliente.email ?? "Sin email"}</span>
            {cliente.tipoRelacion !== "CLIENTE" && (
              <Badge variant="info">{RELACION_LABEL[cliente.tipoRelacion]}</Badge>
            )}
            {cliente.origen && <Badge variant="muted">Llegó por: {cliente.origen}</Badge>}
            {cliente.conCuenta && <Badge variant="success">Usa la app</Badge>}
          </div>
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="etiqueta flex items-center gap-2">
              <History className="h-4 w-4" /> Historial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="dato-lg">
              {resumen.totalLavados}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                lavados · {formatARS(resumen.totalGastado)}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Cliente desde{" "}
              {resumen.primeraVisita
                ? formatFecha(new Date(resumen.primeraVisita), "MM/yyyy")
                : "—"}
              {cliente.visitasAnotadas != null &&
                ` · Anotado a mano: ${cliente.visitasAnotadas} visitas`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="etiqueta flex items-center gap-2">
              <Trophy className="h-4 w-4" /> Nivel y puntos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span
                className="dato-lg"
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
                  {nivel.puntosParaSiguiente === 1
                    ? "1 punto"
                    : `${nivel.puntosParaSiguiente} puntos`}{" "}
                  para {nivel.siguiente}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="etiqueta flex items-center gap-2">
              <Flame className="h-4 w-4" /> Racha de visitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="dato-lg">{cliente.rachaActual}</p>
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
            <CardTitle className="etiqueta flex items-center gap-2">
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

      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto">
          {/* Tabs subrayados: más livianos que el contenedor tipo píldora */}
          <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b bg-transparent p-0">
            {[
              ["autos", `Autos (${autos.length})`],
              ["lavados", `Lavados (${lavados.length})`],
              ["turnos", `Turnos (${turnos.length})`],
              ["cuenta", "Cuenta"],
              ["info", "Detalles"],
            ].map(([valor, label]) => (
              <TabsTrigger
                key={valor}
                value={valor}
                className="rounded-none border-b-2 border-transparent px-3 pb-2.5 pt-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

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
                <CardContent className="space-y-3 pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <Car className="mt-1 h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {auto.marca !== "—" ? `${auto.marca} ` : ""}
                          {auto.modelo}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {auto.patente ?? "Sin patente"}
                          {auto.color ? ` · ${auto.color}` : ""}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditandoAuto(auto)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="muted">{TIPO_VEHICULO_LABEL[auto.tipo] ?? auto.tipo}</Badge>
                    {(auto.cantidadLavados ?? 0) > 0 ? (
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:underline"
                        onClick={() => {
                          setFiltroAuto(auto.id);
                          setTab("lavados");
                        }}
                      >
                        Ver sus {auto.cantidadLavados}{" "}
                        {auto.cantidadLavados === 1 ? "lavado" : "lavados"} →
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin lavados</span>
                    )}
                  </div>
                  {auto.descripcionOriginal &&
                    auto.descripcionOriginal !== auto.modelo && (
                      <p className="text-xs text-muted-foreground">
                        En el registro original: “{auto.descripcionOriginal}”
                      </p>
                    )}
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

        <TabsContent value="lavados" className="space-y-3">
          {autoFiltrado && (
            <button
              type="button"
              onClick={() => setFiltroAuto(null)}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary/10 px-3 py-1 text-sm text-primary"
            >
              Solo {autoFiltrado.marca !== "—" ? `${autoFiltrado.marca} ` : ""}
              {autoFiltrado.modelo}
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="rounded-lg border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Auto</TableHead>
                  <TableHead>Cobrado</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Puntos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lavadosVisibles.map((l) => (
                  <TableRow
                    key={l.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/admin/lavados/${l.id}`)}
                  >
                    <TableCell>
                      {formatFecha(new Date(l.fecha), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>{l.servicio}</TableCell>
                    <TableCell>{l.auto}</TableCell>
                    <TableCell>
                      {l.cobrado != null
                        ? formatARS(l.cobrado)
                        : l.precio != null
                          ? formatARS(l.precio)
                          : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={BADGE_PAGO[l.estadoPago] ?? "muted"}>
                        {ESTADO_PAGO_LABEL[l.estadoPago] ?? l.estadoPago}
                      </Badge>
                    </TableCell>
                    <TableCell>{l.puntos || "—"}</TableCell>
                  </TableRow>
                ))}
                {lavadosVisibles.length === 0 && (
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

        <TabsContent value="cuenta">
          <CuentaTab
            clienteId={cliente.id}
            saldo={cuenta.saldo}
            movimientos={cuenta.movimientos}
            esAdmin={cuenta.esAdmin}
          />
        </TabsContent>

        <TabsContent value="info" className="space-y-3">
          <Card>
            <CardContent className="grid gap-x-6 gap-y-3 pt-6 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Relación</p>
                <p className="font-medium">{RELACION_LABEL[cliente.tipoRelacion]}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">¿Cómo llegó?</p>
                <p className="font-medium">{cliente.origen ?? "Sin dato"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Teléfono</p>
                <p className="font-medium">{cliente.telefono ?? "Sin dato"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium">{cliente.email ?? "Sin dato"}</p>
              </div>
              {cliente.nombreOriginal &&
                cliente.nombreOriginal !== cliente.nombre && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Nombre en el registro original
                    </p>
                    <p className="font-medium">{cliente.nombreOriginal}</p>
                  </div>
                )}
              {cliente.visitasAnotadas != null && (
                <div>
                  <p className="text-xs text-muted-foreground">
                    Visitas anotadas a mano (control)
                  </p>
                  <p className="font-medium">
                    {cliente.visitasAnotadas} anotadas · {resumen.totalLavados}{" "}
                    reales
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Observaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">
                {cliente.detalles || "Sin observaciones cargadas."}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
