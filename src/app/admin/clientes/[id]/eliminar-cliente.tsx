"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { formatARS } from "@/lib/format";
import {
  eliminarCliente,
  previsualizarEliminacion,
  type ResumenEliminacion,
} from "@/server/actions/clientes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Borrado definitivo de un cliente. Muestra qué se pierde antes de confirmar y,
 * si tiene historial, pide escribir el nombre: borrarlo baja los ingresos del
 * mes y no hay vuelta atrás.
 */
export function EliminarCliente({ clienteId }: { clienteId: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = React.useState(false);

  return (
    <>
      <Button
        variant="outline"
        className="flex-1 text-destructive sm:flex-none"
        onClick={() => setAbierto(true)}
      >
        <Trash2 className="h-4 w-4" />
        Eliminar
      </Button>
      {abierto && (
        <DialogoEliminar
          clienteId={clienteId}
          onCerrar={() => setAbierto(false)}
          onEliminado={() => {
            setAbierto(false);
            toast.success("Cliente eliminado");
            router.push("/admin/clientes");
          }}
        />
      )}
    </>
  );
}

function DialogoEliminar({
  clienteId,
  onCerrar,
  onEliminado,
}: {
  clienteId: string;
  onCerrar: () => void;
  onEliminado: () => void;
}) {
  const [resumen, setResumen] = React.useState<ResumenEliminacion | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmacion, setConfirmacion] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);

  React.useEffect(() => {
    let vigente = true;
    previsualizarEliminacion(clienteId).then((r) => {
      if (!vigente) return;
      if (r.error) setError(r.error);
      else setResumen(r.resumen ?? null);
    });
    return () => {
      vigente = false;
    };
  }, [clienteId]);

  return (
    <Dialog open onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar cliente</DialogTitle>
        </DialogHeader>
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        {!resumen && !error && (
          <p className="text-sm text-muted-foreground">Calculando…</p>
        )}
        {resumen && (
          <div className="space-y-4">
            {resumen.limpio ? (
              <p className="text-sm">
                <strong>{resumen.nombre}</strong> no tiene lavados ni turnos cargados:
                no se pierde historial.
              </p>
            ) : (
              <p className="text-sm">
                Se borra <strong>{resumen.nombre}</strong> con todo su historial. Si
                solo querés sacarlo de los listados, <strong>archivalo</strong>: queda
                escondido pero sus lavados siguen contando.
              </p>
            )}

            <div className="grid grid-cols-3 gap-2 rounded-xl border bg-muted/40 p-3 text-center">
              {[
                ["Lavados", resumen.lavados],
                ["Turnos", resumen.turnos],
                ["Autos", resumen.autos],
                ["Puntos", resumen.puntos],
                ["Cuenta", resumen.movimientosCuenta],
                ["Caja", resumen.movimientosCaja],
              ].map(([label, valor]) => (
                <div key={label as string}>
                  <p className="text-lg font-semibold tabular-nums">{valor}</p>
                  <p className="etiqueta text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            <ul className="space-y-1 text-xs text-muted-foreground">
              {resumen.importeCobrado > 0 && (
                <li className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                  <span>
                    Los reportes pierden {formatARS(resumen.importeCobrado)} cobrados en
                    sus lavados.
                  </span>
                </li>
              )}
              {resumen.movimientosCaja > 0 && (
                <li className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                  <span>
                    {resumen.movimientosCaja === 1
                      ? "El movimiento de caja no se borra: se despega"
                      : `Los ${resumen.movimientosCaja} movimientos de caja no se borran: se despegan`}{" "}
                    del cliente y el arqueo sigue cerrando.
                  </span>
                </li>
              )}
              {resumen.vinculadoCon && (
                <li className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                  <span>Se corta el vínculo con {resumen.vinculadoCon}.</span>
                </li>
              )}
            </ul>

            {!resumen.limpio && (
              <div className="space-y-2">
                <Label htmlFor="confirmacion">
                  Escribí <strong>{resumen.nombre}</strong> para confirmar
                </Label>
                <Input
                  id="confirmacion"
                  value={confirmacion}
                  onChange={(e) => setConfirmacion(e.target.value)}
                  autoComplete="off"
                />
              </div>
            )}

            <p className="text-xs font-medium text-destructive">
              Esta acción no se puede deshacer.
            </p>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onCerrar}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={enviando}
                onClick={async () => {
                  setEnviando(true);
                  const r = await eliminarCliente(clienteId, confirmacion);
                  setEnviando(false);
                  if (r?.error) {
                    setError(r.error);
                    return;
                  }
                  onEliminado();
                }}
              >
                {enviando ? "Eliminando…" : "Eliminar"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
