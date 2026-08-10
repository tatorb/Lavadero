"use client";

import * as React from "react";
import { Car, Link2, Plus, X } from "lucide-react";

import { TIPOS_VEHICULO } from "@/lib/format";
import { TIPO_VINCULO_LABEL, type TipoVinculo } from "@/lib/clientes/vinculos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BuscadorCliente, type ItemBuscable } from "@/components/admin/buscador-cliente";

/** Encabezado de sección dentro del formulario de alta. */
function Seccion({
  icono,
  titulo,
  ayuda,
  accion,
  children,
}: {
  icono: React.ReactNode;
  titulo: string;
  ayuda?: string;
  accion?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icono}</span>
          <p className="etiqueta">{titulo}</p>
        </div>
        {accion}
      </div>
      {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
      {children}
    </div>
  );
}

/**
 * Auto del cliente, dentro del alta. Es opcional pero va desplegado porque sin
 * auto no se le puede registrar un lavado: lo normal es cargarlo acá.
 */
export function CamposAuto() {
  return (
    <Seccion
      icono={<Car className="h-4 w-4" />}
      titulo="Auto"
      ayuda="Opcional. Si lo cargás ahora, ya podés registrarle un lavado."
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="autoMarca">Marca</Label>
          <Input id="autoMarca" name="autoMarca" placeholder="Volkswagen" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="autoModelo">Modelo</Label>
          <Input id="autoModelo" name="autoModelo" placeholder="Gol" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="autoPatente">Patente</Label>
          <Input id="autoPatente" name="autoPatente" placeholder="AB123CD" />
        </div>
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select name="autoTipo" defaultValue="AUTO">
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
          <Label htmlFor="autoColor">Color</Label>
          <Input id="autoColor" name="autoColor" />
        </div>
      </div>
    </Seccion>
  );
}

const TIPOS_VINCULO: TipoVinculo[] = ["PAREJA", "FAMILIAR", "AMIGO"];

/**
 * Vínculo con otra persona. Se puede apuntar a un cliente ya cargado o crear a
 * la pareja en el mismo paso, que es el caso del mostrador: llegan los dos.
 */
export function CamposVinculo({ candidatos }: { candidatos: ItemBuscable[] }) {
  const [abierto, setAbierto] = React.useState(false);
  const [existente, setExistente] = React.useState<ItemBuscable | null>(null);
  const [creandoNuevo, setCreandoNuevo] = React.useState(false);

  if (!abierto) {
    return (
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => setAbierto(true)}
      >
        <Link2 className="h-4 w-4" />
        Vincular con una pareja o familiar
      </Button>
    );
  }

  return (
    <Seccion
      icono={<Link2 className="h-4 w-4" />}
      titulo="Vínculo"
      ayuda="Comparten los autos y toman el mejor nivel de los dos para los descuentos."
      accion={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Quitar vínculo"
          onClick={() => {
            setAbierto(false);
            setExistente(null);
            setCreandoNuevo(false);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      }
    >
      {/* El id viaja en el form; el buscador es solo para elegirlo */}
      <input type="hidden" name="vinculoConId" value={existente?.id ?? ""} />

      {creandoNuevo ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="vinculoNombre">Nombre</Label>
              <Input id="vinculoNombre" name="vinculoNombre" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vinculoApellido">Apellido</Label>
              <Input id="vinculoApellido" name="vinculoApellido" />
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setCreandoNuevo(false)}
          >
            Buscar un cliente que ya esté cargado
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <BuscadorCliente
            items={candidatos}
            seleccionado={existente}
            onSeleccionar={setExistente}
            placeholder="Buscar la pareja o familiar…"
          />
          {!existente && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setCreandoNuevo(true)}
            >
              <Plus className="h-4 w-4" />
              No está cargado, crearlo ahora
            </Button>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>Qué son entre sí</Label>
        <Select name="vinculoTipo" defaultValue="PAREJA">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPOS_VINCULO.map((t) => (
              <SelectItem key={t} value={t}>
                {TIPO_VINCULO_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Seccion>
  );
}
