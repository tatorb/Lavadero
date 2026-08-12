"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Gift, Wallet } from "lucide-react";
import { toast } from "sonner";

import { formatARS } from "@/lib/format";
import { cerrarLavado } from "@/server/actions/lavados";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { LavadoEnCurso } from "./tablero";

const FORMAS = [
  ["EFECTIVO", "Efectivo"],
  ["TRANSFERENCIA", "Transferencia"],
  ["MIXTO", "Mixto"],
  ["OTRO", "Otro"],
] as const;

type Forma = (typeof FORMAS)[number][0];

/** Atajos de descuento: lo que más se usa en el mostrador. */
const PORCENTAJES = [10, 15, 20, 50];

/**
 * Cierre del lavado: cobro y entrega en un solo paso. Muestra el precio de
 * lista, el descuento y el total en grande, porque es el número que el
 * operador le canta al cliente.
 */
export function HojaCobro({
  lavado,
  onCerrar,
}: {
  lavado: LavadoEnCurso;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const lista = lavado.precioLista ?? 0;

  const [descuento, setDescuento] = React.useState("");
  const [forma, setForma] = React.useState<Forma>("EFECTIVO");
  const [efectivo, setEfectivo] = React.useState("");
  const [transferencia, setTransferencia] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const descuentoNum = Math.min(Math.max(Number(descuento) || 0, 0), lista);
  const total = Math.max(lista - descuentoNum, 0);
  const sumaMixto = (Number(efectivo) || 0) + (Number(transferencia) || 0);
  const mixtoDescuadra = forma === "MIXTO" && Math.abs(sumaMixto - total) > 0.01;

  const cobrar = async (esCortesia = false) => {
    setEnviando(true);
    setError(null);
    const r = await cerrarLavado(lavado.id, {
      importe: esCortesia ? 0 : total,
      formaPago: esCortesia ? "SIN_DATO" : forma,
      pagos:
        !esCortesia && forma === "MIXTO"
          ? [
              { medio: "EFECTIVO" as const, importe: Number(efectivo) || 0 },
              { medio: "TRANSFERENCIA" as const, importe: Number(transferencia) || 0 },
            ].filter((p) => p.importe > 0)
          : undefined,
      esCortesia,
      // El descuento es una decisión del lavadero, no una deuda del cliente
      tratamientoFaltante: "BONIFICADO",
      motivo: descuentoNum > 0 ? `Descuento de ${formatARS(descuentoNum)}` : undefined,
    });
    setEnviando(false);
    if (r?.error) {
      setError(r.error);
      return;
    }
    toast.success(esCortesia ? "Lavado de cortesía entregado" : "Cobrado y entregado");
    onCerrar();
    router.refresh();
  };

  return (
    <Sheet open onOpenChange={(v) => !v && onCerrar()}>
      <SheetContent side="bottom" className="gap-0 p-4 pb-6">
        <SheetTitle className="text-lg">Cobrar y entregar</SheetTitle>
        <p className="mb-4 text-sm text-muted-foreground">
          {lavado.cliente} · {lavado.auto}
        </p>

        <div className="space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Precio de lista</span>
            <span className="font-medium tabular-nums">{formatARS(lista)}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descuento">Descuento</Label>
            <Input
              id="descuento"
              type="number"
              inputMode="decimal"
              min={0}
              max={lista}
              placeholder="0"
              value={descuento}
              onChange={(e) => setDescuento(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {PORCENTAJES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDescuento(String(Math.round((lista * p) / 100)))}
                  className="rounded-full border border-input px-3 py-1 text-xs text-muted-foreground transition-transform duration-100 hover:bg-accent active:scale-95"
                >
                  {p}%
                </button>
              ))}
              {descuentoNum > 0 && (
                <button
                  type="button"
                  onClick={() => setDescuento("")}
                  className="rounded-full border border-input px-3 py-1 text-xs text-muted-foreground transition-transform duration-100 hover:bg-accent active:scale-95"
                >
                  Quitar
                </button>
              )}
            </div>
          </div>

          <div className="flex items-baseline justify-between rounded-xl bg-muted/50 p-3">
            <span className="etiqueta text-muted-foreground">Total a cobrar</span>
            <span className="dato-lg">{formatARS(total)}</span>
          </div>

          <div className="space-y-2">
            <Label>Forma de pago</Label>
            <div className="grid grid-cols-2 gap-2">
              {FORMAS.map(([valor, label]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setForma(valor)}
                  className={`rounded-xl border px-3 py-2.5 text-sm transition-[transform,background-color,color] duration-100 active:scale-95 ${
                    forma === valor
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "border-input text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {forma === "MIXTO" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="efectivo">Efectivo</Label>
                <Input
                  id="efectivo"
                  type="number"
                  inputMode="decimal"
                  value={efectivo}
                  onChange={(e) => setEfectivo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transferencia">Transferencia</Label>
                <Input
                  id="transferencia"
                  type="number"
                  inputMode="decimal"
                  value={transferencia}
                  onChange={(e) => setTransferencia(e.target.value)}
                />
              </div>
              {mixtoDescuadra && (
                <p className="col-span-2 text-xs font-medium text-amber-600">
                  Los dos medios suman {formatARS(sumaMixto)} y el total es{" "}
                  {formatARS(total)}.
                </p>
              )}
            </div>
          )}

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <div className="space-y-2">
            <Button
              className="h-12 w-full text-base"
              disabled={enviando || mixtoDescuadra}
              onClick={() => cobrar()}
            >
              <Wallet className="h-5 w-5" />
              {enviando ? "Guardando…" : `Cobrar ${formatARS(total)} y entregar`}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onCerrar}>
                Cancelar
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={enviando}
                onClick={() => cobrar(true)}
              >
                <Gift className="h-4 w-4" />
                Cortesía
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
