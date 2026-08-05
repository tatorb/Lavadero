"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import { toast } from "sonner";

import { formatFecha } from "@/lib/format";
import { deshacerImportacion } from "@/server/actions/importaciones";
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
}: {
  batches: BatchRow[];
  puedeDeshacer: boolean;
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = React.useState<BatchRow | null>(null);
  const [pending, setPending] = React.useState(false);

  return (
    <div className="space-y-4">
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
