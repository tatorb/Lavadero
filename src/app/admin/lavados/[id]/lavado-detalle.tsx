"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  Check,
  Clock,
  Flag,
  Gift,
  PackageCheck,
  Play,
  Sparkles,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  ESTADO_PAGO_LABEL,
  FORMA_PAGO_LABEL,
  formatARS,
  formatFecha,
} from "@/lib/format";
import {
  cancelarLavado,
  editarDetallesLavado,
  entregarLavado,
  finalizarLavado,
  iniciarLavado,
  registrarCobro,
} from "@/server/actions/lavados";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface LavadoData {
  id: string;
  cliente: { id: string; nombre: string };
  auto: string;
  servicio: string;
  addons: Array<{ nombre: string; precio: number }>;
  llegadaAt: string;
  inicioAt: string | null;
  finAt: string | null;
  entregadoAt: string | null;
  canceladoAt: string | null;
  detalles: string | null;
  precioFinal: number | null;
  puntosOtorgados: number;
  deTurno: boolean;
  importeCobrado: number | null;
  estadoPago: string;
  formaPago: string;
  motivoAjuste: string | null;
  pagos: Array<{ medio: string; importe: number }>;
}

const BADGE_ESTADO_PAGO: Record<string, "success" | "warning" | "info" | "muted"> = {
  PAGADO: "success",
  PARCIAL: "warning",
  PENDIENTE: "warning",
  CORTESIA: "info",
  SALDO_APLICADO: "info",
  BONIFICADO: "info",
  SIN_DATO: "muted",
};

function PasoTimeline({
  icono,
  titulo,
  fecha,
  activo,
  accion,
}: {
  icono: React.ReactNode;
  titulo: string;
  fecha: string | null;
  activo: boolean;
  accion?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
          fecha
            ? "border-primary bg-primary text-primary-foreground"
            : activo
              ? "border-primary text-primary"
              : "border-muted-foreground/30 text-muted-foreground/50"
        }`}
      >
        {fecha ? <Check className="h-5 w-5" /> : icono}
      </div>
      <div className="flex-1">
        <p className={`font-medium ${!fecha && !activo ? "text-muted-foreground/60" : ""}`}>
          {titulo}
        </p>
        <p className="text-sm text-muted-foreground">
          {fecha ? formatFecha(new Date(fecha)) : activo ? "Pendiente" : "—"}
        </p>
      </div>
      {accion}
    </div>
  );
}

export function LavadoDetalle({ lavado }: { lavado: LavadoData }) {
  const router = useRouter();
  const [detalles, setDetalles] = React.useState(lavado.detalles ?? "");
  const [pendiente, setPendiente] = React.useState(false);

  const accion = async (fn: () => Promise<{ error?: string } | undefined>) => {
    setPendiente(true);
    const r = await fn();
    setPendiente(false);
    if (r?.error) toast.error(r.error);
    else router.refresh();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/lavados">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{lavado.servicio}</h1>
          <p className="text-sm text-muted-foreground">
            <Link
              href={`/admin/clientes/${lavado.cliente.id}`}
              className="text-primary hover:underline"
            >
              {lavado.cliente.nombre}
            </Link>{" "}
            · {lavado.auto}
            {lavado.deTurno && (
              <Badge variant="info" className="ml-2">
                Con turno
              </Badge>
            )}
          </p>
        </div>
        {lavado.canceladoAt ? (
          <Badge variant="muted">Cancelado</Badge>
        ) : lavado.entregadoAt ? (
          <Badge variant="info">Entregado</Badge>
        ) : lavado.finAt ? (
          <Badge variant="success">Finalizado</Badge>
        ) : lavado.inicioAt ? (
          <Badge variant="info">En curso</Badge>
        ) : (
          <Badge variant="warning">En espera</Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estado del lavado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <PasoTimeline
            icono={<Clock className="h-5 w-5" />}
            titulo="Llegada al lavadero"
            fecha={lavado.llegadaAt}
            activo={false}
          />
          <PasoTimeline
            icono={<Play className="h-5 w-5" />}
            titulo="Inicio del lavado"
            fecha={lavado.inicioAt}
            activo={!lavado.inicioAt}
            accion={
              !lavado.inicioAt ? (
                <Button
                  size="sm"
                  disabled={pendiente}
                  onClick={() => accion(() => iniciarLavado(lavado.id))}
                >
                  <Play className="h-4 w-4" />
                  Iniciar
                </Button>
              ) : undefined
            }
          />
          <PasoTimeline
            icono={<Flag className="h-5 w-5" />}
            titulo="Finalización"
            fecha={lavado.finAt}
            activo={!!lavado.inicioAt && !lavado.finAt}
            accion={
              lavado.inicioAt && !lavado.finAt ? (
                <Button
                  size="sm"
                  disabled={pendiente}
                  onClick={() => accion(() => finalizarLavado(lavado.id))}
                >
                  <Flag className="h-4 w-4" />
                  Finalizar
                </Button>
              ) : undefined
            }
          />
          <PasoTimeline
            icono={<PackageCheck className="h-5 w-5" />}
            titulo="Entrega del vehículo"
            fecha={lavado.entregadoAt}
            activo={!!lavado.finAt && !lavado.entregadoAt && !lavado.canceladoAt}
            accion={
              lavado.finAt && !lavado.entregadoAt && !lavado.canceladoAt ? (
                <Button
                  size="sm"
                  disabled={pendiente}
                  onClick={() => accion(() => entregarLavado(lavado.id))}
                >
                  <PackageCheck className="h-4 w-4" />
                  Entregar
                </Button>
              ) : undefined
            }
          />
          {lavado.finAt && lavado.puntosOtorgados > 0 && (
            <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
              <Sparkles className="h-4 w-4" />
              El cliente sumó {lavado.puntosOtorgados} puntos con este lavado
            </div>
          )}
          {lavado.canceladoAt && (
            <p className="text-sm text-muted-foreground">
              Cancelado el {formatFecha(new Date(lavado.canceladoAt))}.
            </p>
          )}
          {!lavado.finAt && !lavado.canceladoAt && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              disabled={pendiente}
              onClick={() => accion(() => cancelarLavado(lavado.id))}
            >
              <XCircle className="h-4 w-4" />
              Cancelar lavado
            </Button>
          )}
        </CardContent>
      </Card>

      {!lavado.canceladoAt && <CobroCard lavado={lavado} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Servicio y precio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>{lavado.servicio}</span>
            <span className="text-muted-foreground">
              {lavado.precioFinal != null
                ? formatARS(
                    lavado.precioFinal - lavado.addons.reduce((s, a) => s + a.precio, 0)
                  )
                : "—"}
            </span>
          </div>
          {lavado.addons.map((a) => (
            <div key={a.nombre} className="flex justify-between text-muted-foreground">
              <span>+ {a.nombre}</span>
              <span>{formatARS(a.precio)}</span>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{lavado.precioFinal != null ? formatARS(lavado.precioFinal) : "—"}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={detalles}
            onChange={(e) => setDetalles(e.target.value)}
            placeholder="Observaciones del lavado…"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={pendiente || detalles === (lavado.detalles ?? "")}
            onClick={() =>
              accion(async () => {
                const r = await editarDetallesLavado(lavado.id, detalles);
                if (!r?.error) toast.success("Detalles guardados");
                return r;
              })
            }
          >
            Guardar detalles
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Cobro =====

function CobroCard({ lavado }: { lavado: LavadoData }) {
  const router = useRouter();
  const [abierto, setAbierto] = React.useState(false);
  const sinCobro = lavado.estadoPago === "SIN_DATO";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            Cobro
          </span>
          <Badge variant={BADGE_ESTADO_PAGO[lavado.estadoPago] ?? "muted"}>
            {ESTADO_PAGO_LABEL[lavado.estadoPago] ?? lavado.estadoPago}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!sinCobro && (
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Importe cobrado</span>
              <span className="font-semibold">
                {lavado.importeCobrado != null ? formatARS(lavado.importeCobrado) : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Forma de pago</span>
              <span>{FORMA_PAGO_LABEL[lavado.formaPago] ?? lavado.formaPago}</span>
            </div>
            {lavado.pagos.map((p, i) => (
              <div key={i} className="flex justify-between text-muted-foreground">
                <span className="pl-3">· {FORMA_PAGO_LABEL[p.medio] ?? p.medio}</span>
                <span>{formatARS(p.importe)}</span>
              </div>
            ))}
            {lavado.motivoAjuste && (
              <p className="text-muted-foreground">{lavado.motivoAjuste}</p>
            )}
          </div>
        )}
        <Button
          size="sm"
          variant={sinCobro ? "default" : "outline"}
          onClick={() => setAbierto(true)}
        >
          <Banknote className="h-4 w-4" />
          {sinCobro ? "Registrar cobro" : "Corregir cobro"}
        </Button>
        {abierto && (
          <CobroDialog
            lavado={lavado}
            onClose={(refrescar) => {
              setAbierto(false);
              if (refrescar) router.refresh();
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

function CobroDialog({
  lavado,
  onClose,
}: {
  lavado: LavadoData;
  onClose: (refrescar: boolean) => void;
}) {
  const precioLista = lavado.precioFinal ?? 0;
  const [esCortesia, setEsCortesia] = React.useState(lavado.estadoPago === "CORTESIA");
  const [importe, setImporte] = React.useState(
    lavado.importeCobrado != null && lavado.importeCobrado > 0
      ? String(lavado.importeCobrado)
      : String(precioLista)
  );
  const [formaPago, setFormaPago] = React.useState<
    "EFECTIVO" | "TRANSFERENCIA" | "MIXTO" | "OTRO" | "SIN_DATO"
  >(
    lavado.formaPago !== "SIN_DATO"
      ? (lavado.formaPago as "EFECTIVO" | "TRANSFERENCIA" | "MIXTO" | "OTRO")
      : "EFECTIVO"
  );
  const [efectivo, setEfectivo] = React.useState("");
  const [transferencia, setTransferencia] = React.useState("");
  const [faltante, setFaltante] = React.useState<"BONIFICADO" | "DEUDA">("BONIFICADO");
  const [sobrante, setSobrante] = React.useState<"SALDO_A_FAVOR" | "PROPINA">(
    "SALDO_A_FAVOR"
  );
  const [motivo, setMotivo] = React.useState(lavado.motivoAjuste ?? "");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const importeNum = Number(importe) || 0;
  const diferencia = importeNum - precioLista;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar cobro</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">Precio de lista</span>
            <span className="font-semibold">{formatARS(precioLista)}</span>
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Gift className="h-4 w-4 text-muted-foreground" />
              Cortesía (sin cargo)
            </div>
            <Switch checked={esCortesia} onCheckedChange={setEsCortesia} />
          </div>

          {!esCortesia && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="importeCobro">Importe cobrado</Label>
                  <Input
                    id="importeCobro"
                    type="number"
                    min={0}
                    step="0.01"
                    value={importe}
                    onChange={(e) => setImporte(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Forma de pago</Label>
                  <Select
                    value={formaPago}
                    onValueChange={(v) => setFormaPago(v as typeof formaPago)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                      <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                      <SelectItem value="MIXTO">Mixto</SelectItem>
                      <SelectItem value="OTRO">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formaPago === "MIXTO" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="mixtoEfectivo">Efectivo</Label>
                    <Input
                      id="mixtoEfectivo"
                      type="number"
                      min={0}
                      value={efectivo}
                      onChange={(e) => setEfectivo(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mixtoTransfer">Transferencia</Label>
                    <Input
                      id="mixtoTransfer"
                      type="number"
                      min={0}
                      value={transferencia}
                      onChange={(e) => setTransferencia(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {diferencia < -0.01 && (
                <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
                  <p className="font-medium text-amber-900">
                    Se cobró {formatARS(-diferencia)} menos que el precio de lista
                  </p>
                  <Select
                    value={faltante}
                    onValueChange={(v) => setFaltante(v as typeof faltante)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BONIFICADO">
                        Fue un descuento (no genera deuda)
                      </SelectItem>
                      <SelectItem value="DEUDA">Queda debiendo la diferencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {diferencia > 0.01 && (
                <div className="space-y-2 rounded-md border border-sky-300 bg-sky-50 p-3 text-sm">
                  <p className="font-medium text-sky-900">
                    Pagó {formatARS(diferencia)} de más
                  </p>
                  <Select
                    value={sobrante}
                    onValueChange={(v) => setSobrante(v as typeof sobrante)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SALDO_A_FAVOR">
                        Queda como saldo a favor
                      </SelectItem>
                      <SelectItem value="PROPINA">Fue una propina</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="motivoCobro">Motivo / observaciones</Label>
            <Textarea
              id="motivoCobro"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: le hice precio, sorteo de redes, pagó de más…"
            />
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <Button
            className="w-full"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              setError(null);
              const pagos =
                formaPago === "MIXTO"
                  ? ([
                      { medio: "EFECTIVO" as const, importe: Number(efectivo) || 0 },
                      {
                        medio: "TRANSFERENCIA" as const,
                        importe: Number(transferencia) || 0,
                      },
                    ].filter((p) => p.importe > 0))
                  : undefined;
              const r = await registrarCobro(lavado.id, {
                importe: esCortesia ? 0 : importeNum,
                formaPago: esCortesia ? "SIN_DATO" : formaPago,
                pagos,
                esCortesia,
                tratamientoFaltante: faltante,
                tratamientoSobrante: sobrante,
                motivo: motivo || undefined,
              });
              setPending(false);
              if (r?.error) setError(r.error);
              else {
                toast.success("Cobro registrado");
                onClose(true);
              }
            }}
          >
            {pending ? "Guardando…" : "Guardar cobro"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
