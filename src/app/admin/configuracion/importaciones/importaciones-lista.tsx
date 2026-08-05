"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { formatFecha } from "@/lib/format";
import {
  deshacerImportacion,
  importarRegistroHistorico,
} from "@/server/actions/importaciones";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BatchRow {
  id: string;
  nombre: string;
  estado: "APLICADO" | "DESHECHO";
  createdAt: string;
  deshechoAt: string | null;
  resumen: Record<string, number> | null;
}

const ETIQUETAS: Record<string, string> = {
  lavados: "Lavados",
  clientes: "Clientes",
  autos: "Vehículos",
  movimientosCaja: "Mov. de caja",
  cortesias: "Cortesías",
  deudas: "Deudas",
  saldosAFavor: "Saldos a favor",
  filasConRevision: "Filas a revisar",
  conflictos: "Conflictos",
};

export function ImportacionesLista({
  batches,
  puedeDeshacer,
  puedeImportar,
}: {
  batches: BatchRow[];
  puedeDeshacer: boolean;
  puedeImportar: boolean;
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = React.useState<BatchRow | null>(null);
  const [confirmandoImport, setConfirmandoImport] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  return (
    <div className="space-y-4">
      {puedeImportar && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <div>
              <p className="font-semibold">Registro histórico de El Bosquecito</p>
              <p className="text-sm text-muted-foreground">
                Importa en este lavadero los ~585 lavados, 287 clientes, gastos de
                caja y cuentas corrientes del registro (oct 2025 – ago 2026), con
                el catálogo de servicios y los puntos/niveles recalculados.
              </p>
            </div>
            <Button onClick={() => setConfirmandoImport(true)} disabled={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {pending ? "Importando…" : "Importar ahora"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={confirmandoImport} onOpenChange={(o) => !o && setConfirmandoImport(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Importar el registro histórico?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se van a crear en <strong>este lavadero</strong> los clientes,
            vehículos, lavados, gastos de caja y cuentas corrientes del registro
            histórico de El Bosquecito, y se agregará el catálogo de servicios con
            precios por tipo de vehículo. Todo entra como un lote que después se
            puede deshacer desde esta misma pantalla.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmandoImport(false)}>
              Cancelar
            </Button>
            <Button
              disabled={pending}
              onClick={async () => {
                setPending(true);
                setConfirmandoImport(false);
                toast.info("Importando… puede tardar un minuto");
                const r = await importarRegistroHistorico();
                setPending(false);
                if (r?.error) toast.error(r.error);
                else {
                  toast.success("Registro histórico importado");
                  router.refresh();
                }
              }}
            >
              Sí, importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {batches.map((b) => (
        <Card key={b.id}>
          <CardContent className="space-y-3 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{b.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  Importado el {formatFecha(new Date(b.createdAt))}
                  {b.deshechoAt &&
                    ` · deshecho el ${formatFecha(new Date(b.deshechoAt))}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={b.estado === "APLICADO" ? "success" : "muted"}>
                  {b.estado === "APLICADO" ? "Aplicado" : "Deshecho"}
                </Badge>
                {puedeDeshacer && b.estado === "APLICADO" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setConfirmando(b)}
                  >
                    <Undo2 className="h-4 w-4" />
                    Deshacer
                  </Button>
                )}
              </div>
            </div>
            {b.resumen && (
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(ETIQUETAS).map(([clave, etiqueta]) =>
                  b.resumen![clave] != null ? (
                    <Badge key={clave} variant="muted">
                      {etiqueta}: {b.resumen![clave]}
                    </Badge>
                  ) : null
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!confirmando} onOpenChange={(o) => !o && setConfirmando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Deshacer la importación?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se van a eliminar todos los clientes, vehículos, lavados y movimientos
            creados por este lote ({confirmando?.resumen?.lavados ?? "?"} lavados,{" "}
            {confirmando?.resumen?.clientes ?? "?"} clientes). Esta acción no se
            puede revertir desde acá — habría que volver a importar.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmando(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={async () => {
                if (!confirmando) return;
                setPending(true);
                const r = await deshacerImportacion(confirmando.id);
                setPending(false);
                if (r?.error) toast.error(r.error);
                else {
                  toast.success("Importación deshecha");
                  setConfirmando(null);
                  router.refresh();
                }
              }}
            >
              {pending ? "Deshaciendo…" : "Sí, deshacer todo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
