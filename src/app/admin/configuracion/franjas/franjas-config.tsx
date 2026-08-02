"use client";

import * as React from "react";
import { CheckCircle2, Clock3, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { DIAS_SEMANA, minutosAHora } from "@/lib/format";
import {
  crearRegla,
  editarRegla,
  eliminarRegla,
  toggleRegla,
  type EstadoAccion,
} from "@/server/actions/reglas";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export interface ReglaRow {
  id: string;
  diaSemana: number;
  horaInicio: number;
  horaFin: number;
  slotMin: number;
  capacidadPorSlot: number;
  confirmacionAuto: boolean;
  anticipacionMinHoras: number | null;
  anticipacionMaxDias: number | null;
  activo: boolean;
}

function ReglaForm({
  regla,
  onDone,
}: {
  regla?: ReglaRow;
  onDone: () => void;
}) {
  const action = regla ? editarRegla.bind(null, regla.id) : crearRegla;
  const [confirmacionAuto, setConfirmacionAuto] = React.useState(
    regla?.confirmacionAuto ?? false
  );
  const [state, formAction, pending] = React.useActionState(
    async (prev: EstadoAccion, formData: FormData) => {
      const result = await action(prev, formData);
      if (result?.ok) {
        toast.success("Regla guardada");
        onDone();
      }
      return result;
    },
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label>Día de la semana</Label>
        <Select name="diaSemana" defaultValue={String(regla?.diaSemana ?? 1)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DIAS_SEMANA.map((dia, i) => (
              <SelectItem key={i} value={String(i)}>
                {dia}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="horaInicio">Desde</Label>
          <Input
            id="horaInicio"
            name="horaInicio"
            type="time"
            step={300}
            defaultValue={regla ? minutosAHora(regla.horaInicio) : "09:00"}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="horaFin">Hasta</Label>
          <Input
            id="horaFin"
            name="horaFin"
            type="time"
            step={300}
            defaultValue={regla ? minutosAHora(regla.horaFin) : "18:00"}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slotMin">Duración del slot (min)</Label>
          <Input
            id="slotMin"
            name="slotMin"
            type="number"
            min={10}
            step={5}
            defaultValue={regla?.slotMin ?? 30}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacidadPorSlot">Autos por slot</Label>
          <Input
            id="capacidadPorSlot"
            name="capacidadPorSlot"
            type="number"
            min={1}
            defaultValue={regla?.capacidadPorSlot ?? 1}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="anticipacionMinHoras">Anticipación mínima (horas)</Label>
          <Input
            id="anticipacionMinHoras"
            name="anticipacionMinHoras"
            type="number"
            min={0}
            placeholder="Sin mínimo"
            defaultValue={regla?.anticipacionMinHoras ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="anticipacionMaxDias">Anticipación máxima (días)</Label>
          <Input
            id="anticipacionMaxDias"
            name="anticipacionMaxDias"
            type="number"
            min={1}
            placeholder="Sin máximo"
            defaultValue={regla?.anticipacionMaxDias ?? ""}
          />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        <div>
          <p className="text-sm font-medium">Confirmación automática</p>
          <p className="text-xs text-muted-foreground">
            Si está activa, el turno se confirma solo; si no, queda pendiente de
            aprobación
          </p>
        </div>
        <Switch
          checked={confirmacionAuto}
          onCheckedChange={setConfirmacionAuto}
        />
        <input
          type="hidden"
          name="confirmacionAuto"
          value={confirmacionAuto ? "true" : ""}
        />
      </div>
      {state?.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Guardando…" : "Guardar regla"}
      </Button>
    </form>
  );
}

function solapa(a: ReglaRow, b: ReglaRow) {
  return (
    a.id !== b.id &&
    a.diaSemana === b.diaSemana &&
    a.activo &&
    b.activo &&
    a.horaInicio < b.horaFin &&
    b.horaInicio < a.horaFin
  );
}

export function FranjasConfig({
  reglas,
  puedeEditar,
}: {
  reglas: ReglaRow[];
  puedeEditar: boolean;
}) {
  const [creando, setCreando] = React.useState(false);
  const [editando, setEditando] = React.useState<ReglaRow | null>(null);

  const porDia = DIAS_SEMANA.map((nombre, dia) => ({
    nombre,
    dia,
    reglas: reglas.filter((r) => r.diaSemana === dia),
  })).filter((d) => d.reglas.length > 0 || d.dia !== 0);

  return (
    <div className="space-y-4">
      {puedeEditar && (
        <div className="flex justify-end">
          <Dialog open={creando} onOpenChange={setCreando}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Nueva regla
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva regla de franja</DialogTitle>
              </DialogHeader>
              <ReglaForm onDone={() => setCreando(false)} />
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="space-y-4">
        {porDia.map(({ nombre, dia, reglas: reglasDia }) => (
          <div key={dia}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {nombre}
            </h2>
            {reglasDia.length === 0 ? (
              <p className="text-sm text-muted-foreground/70">
                Sin reglas — los clientes no pueden reservar este día.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {reglasDia.map((regla) => {
                  const tieneSolape = reglas.some((otra) => solapa(regla, otra));
                  return (
                    <Card key={regla.id} className={!regla.activo ? "opacity-60" : ""}>
                      <CardContent className="space-y-3 pt-6">
                        <div className="flex items-center justify-between">
                          <p className="flex items-center gap-2 font-semibold">
                            <Clock3 className="h-4 w-4 text-muted-foreground" />
                            {minutosAHora(regla.horaInicio)} – {minutosAHora(regla.horaFin)}
                          </p>
                          {puedeEditar && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditando(regla)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={async () => {
                                  const r = await eliminarRegla(regla.id);
                                  if (r?.error) toast.error(r.error);
                                  else toast.success("Regla eliminada");
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="muted">
                            Slots de {regla.slotMin}&#39; · {regla.capacidadPorSlot}{" "}
                            {regla.capacidadPorSlot === 1 ? "auto" : "autos"}
                          </Badge>
                          {regla.confirmacionAuto ? (
                            <Badge variant="success">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Confirmación automática
                            </Badge>
                          ) : (
                            <Badge variant="warning">Requiere aprobación</Badge>
                          )}
                          {regla.anticipacionMinHoras != null && (
                            <Badge variant="info">
                              Mín. {regla.anticipacionMinHoras}h de anticipación
                            </Badge>
                          )}
                          {regla.anticipacionMaxDias != null && (
                            <Badge variant="info">
                              Máx. {regla.anticipacionMaxDias} días
                            </Badge>
                          )}
                        </div>
                        {tieneSolape && (
                          <p className="flex items-center gap-1 text-xs text-amber-600">
                            <TriangleAlert className="h-3 w-3" />
                            Se superpone con otra regla del mismo día
                          </p>
                        )}
                        {puedeEditar && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Switch
                              checked={regla.activo}
                              onCheckedChange={async () => {
                                const r = await toggleRegla(regla.id);
                                if (r?.error) toast.error(r.error);
                              }}
                            />
                            {regla.activo ? "Activa" : "Inactiva"}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={!!editando} onOpenChange={(open) => !open && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar regla</DialogTitle>
          </DialogHeader>
          {editando && <ReglaForm regla={editando} onDone={() => setEditando(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
