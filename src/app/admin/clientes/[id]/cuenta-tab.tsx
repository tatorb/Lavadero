"use client";

import * as React from "react";
import { Banknote, Scale } from "lucide-react";
import { toast } from "sonner";

import { TIPO_MOVIMIENTO_CUENTA_LABEL } from "@/lib/cuentas";
import { formatARS, formatFecha } from "@/lib/format";
import {
  registrarAjusteCuenta,
  registrarPagoCuenta,
  type EstadoAccion,
} from "@/server/actions/cuentas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export interface MovimientoCuentaItem {
  id: string;
  fecha: string;
  tipo: keyof typeof TIPO_MOVIMIENTO_CUENTA_LABEL;
  importe: number;
  observaciones: string | null;
  lavadoId: string | null;
}

const BADGE_TIPO: Record<string, "warning" | "success" | "info" | "muted"> = {
  DEUDA: "warning",
  PAGO: "success",
  SALDO_A_FAVOR: "info",
  USO_SALDO: "info",
  CORTESIA: "muted",
  AJUSTE: "muted",
};

function FormMovimiento({
  action,
  conMotivo,
  submitLabel,
  onDone,
}: {
  action: (prev: EstadoAccion, formData: FormData) => Promise<EstadoAccion>;
  conMotivo: boolean;
  submitLabel: string;
  onDone: () => void;
}) {
  const [state, formAction, pending] = React.useActionState(
    async (prev: EstadoAccion, formData: FormData) => {
      const result = await action(prev, formData);
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
      <div className="space-y-2">
        <Label htmlFor="importe">Importe (ARS)</Label>
        <Input id="importe" name="importe" type="number" step="0.01" required />
        {conMotivo && (
          <p className="text-xs text-muted-foreground">
            Positivo suma saldo a favor; negativo genera deuda.
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="observaciones">
          {conMotivo ? "Motivo del ajuste" : "Observaciones"}
        </Label>
        <Textarea id="observaciones" name="observaciones" required={conMotivo} />
      </div>
      {state?.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}

export function CuentaTab({
  clienteId,
  saldo,
  movimientos,
  esAdmin,
}: {
  clienteId: string;
  saldo: number;
  movimientos: MovimientoCuentaItem[];
  esAdmin: boolean;
}) {
  const [pagando, setPagando] = React.useState(false);
  const [ajustando, setAjustando] = React.useState(false);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
          <div>
            <p className="text-sm text-muted-foreground">Saldo de cuenta corriente</p>
            <p
              className={`text-2xl font-bold ${
                saldo > 0
                  ? "text-emerald-700"
                  : saldo < 0
                    ? "text-destructive"
                    : ""
              }`}
            >
              {formatARS(saldo)}
            </p>
            <p className="text-xs text-muted-foreground">
              {saldo > 0
                ? "El cliente tiene saldo a favor"
                : saldo < 0
                  ? "El cliente debe este importe"
                  : "Cuenta al día"}
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={pagando} onOpenChange={setPagando}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Banknote className="h-4 w-4" />
                  Registrar pago
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar pago del cliente</DialogTitle>
                </DialogHeader>
                <FormMovimiento
                  action={registrarPagoCuenta.bind(null, clienteId)}
                  conMotivo={false}
                  submitLabel="Registrar pago"
                  onDone={() => setPagando(false)}
                />
              </DialogContent>
            </Dialog>
            {esAdmin && (
              <Dialog open={ajustando} onOpenChange={setAjustando}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Scale className="h-4 w-4" />
                    Ajuste
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ajuste manual de cuenta</DialogTitle>
                  </DialogHeader>
                  <FormMovimiento
                    action={registrarAjusteCuenta.bind(null, clienteId)}
                    conMotivo
                    submitLabel="Registrar ajuste"
                    onDone={() => setAjustando(false)}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Importe</TableHead>
              <TableHead>Observaciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movimientos.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{formatFecha(new Date(m.fecha), "dd/MM/yyyy")}</TableCell>
                <TableCell>
                  <Badge variant={BADGE_TIPO[m.tipo] ?? "muted"}>
                    {TIPO_MOVIMIENTO_CUENTA_LABEL[m.tipo]}
                  </Badge>
                </TableCell>
                <TableCell>{formatARS(m.importe)}</TableCell>
                <TableCell className="max-w-64 truncate text-muted-foreground">
                  {m.observaciones ?? "—"}
                </TableCell>
              </TableRow>
            ))}
            {movimientos.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                  Sin movimientos de cuenta.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
