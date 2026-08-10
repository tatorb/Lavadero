"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Link2, Link2Off, X } from "lucide-react";
import { toast } from "sonner";

import {
  TIPO_VINCULO_LABEL,
  type RelacionSinTitular,
  type SugerenciaVinculo,
  type TipoVinculo,
} from "@/lib/clientes/vinculos";
import { desvincularCliente, vincularClientes } from "@/server/actions/clientes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BuscadorCliente, type ItemBuscable } from "@/components/admin/buscador-cliente";

export interface ClienteBreve {
  id: string;
  nombre: string;
  telefono: string | null;
  lavados: number;
  autos: number;
  vinculado: boolean;
}

const TIPOS: TipoVinculo[] = ["PAREJA", "FAMILIAR", "AMIGO"];

function SelectTipo({
  valor,
  onCambiar,
}: {
  valor: TipoVinculo;
  onCambiar: (v: TipoVinculo) => void;
}) {
  return (
    <Select value={valor} onValueChange={(v) => onCambiar(v as TipoVinculo)}>
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TIPOS.map((t) => (
          <SelectItem key={t} value={t}>
            {TIPO_VINCULO_LABEL[t]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Tarjeta común: dependiente → titular, con tipo de vínculo y botón. */
function FilaVinculo({
  dependiente,
  titular,
  tipoInicial,
  nota,
  aviso,
  buscador,
  buscadorVisible = false,
  onDescartar,
  onHecho,
}: {
  dependiente: ClienteBreve;
  titular: ClienteBreve | null;
  tipoInicial: TipoVinculo;
  nota?: React.ReactNode;
  aviso?: string;
  /** Si se pasa, deja elegir o cambiar el titular */
  buscador?: React.ReactNode;
  /** Arranca abierto cuando todavía no hay titular o hay que revisarlo */
  buscadorVisible?: boolean;
  onDescartar?: () => void;
  onHecho: () => void;
}) {
  const [tipo, setTipo] = React.useState(tipoInicial);
  const [enviando, setEnviando] = React.useState(false);
  const [buscando, setBuscando] = React.useState(buscadorVisible);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        {nota}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1 rounded-xl border bg-muted/30 p-3">
            <p className="truncate font-medium">{dependiente.nombre}</p>
            <p className="text-xs text-muted-foreground">
              {dependiente.lavados} lavados · {dependiente.autos} autos
            </p>
          </div>
          <ArrowRight className="mx-auto h-4 w-4 shrink-0 rotate-90 text-muted-foreground sm:rotate-0" />
          <div className="min-w-0 flex-1">
            {titular ? (
              <div className="rounded-xl border border-primary bg-primary/5 p-3">
                <p className="truncate font-medium">{titular.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {titular.lavados} lavados · {titular.autos} autos
                </p>
              </div>
            ) : (
              (buscador ?? (
                <p className="text-sm text-muted-foreground">Sin titular</p>
              ))
            )}
          </div>
        </div>
        {titular && buscador && buscando && buscador}
        {aviso && <p className="text-xs font-medium text-amber-600">{aviso}</p>}
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {titular && buscador && !buscando && (
            <Button
              variant="ghost"
              size="sm"
              className="mr-auto text-muted-foreground"
              onClick={() => setBuscando(true)}
            >
              Cambiar titular
            </Button>
          )}
          <SelectTipo valor={tipo} onCambiar={setTipo} />
          {onDescartar && (
            <Button variant="outline" size="sm" onClick={onDescartar}>
              <X className="h-4 w-4" />
              Descartar
            </Button>
          )}
          <Button
            size="sm"
            className="flex-1 sm:flex-none sm:min-w-32"
            disabled={!titular || !!aviso || enviando}
            onClick={async () => {
              if (!titular) return;
              setEnviando(true);
              const r = await vincularClientes(dependiente.id, titular.id, tipo);
              setEnviando(false);
              if (r?.error) toast.error(r.error);
              else {
                toast.success("Vínculo cargado");
                onHecho();
              }
            }}
          >
            <Link2 className="h-4 w-4" />
            {enviando ? "Vinculando…" : "Vincular"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function VinculosClientes({
  clientes,
  sugerencias,
  sinTitular,
  vinculados,
}: {
  clientes: ClienteBreve[];
  sugerencias: SugerenciaVinculo[];
  sinTitular: RelacionSinTitular[];
  vinculados: Array<{ id: string; nombre: string; conNombre: string; tipo: TipoVinculo | null }>;
}) {
  const router = useRouter();
  const porId = React.useMemo(
    () => new Map(clientes.map((c) => [c.id, c])),
    [clientes]
  );
  const [descartadas, setDescartadas] = React.useState<Set<string>>(new Set());
  // Titular elegido a mano, por id de dependiente
  const [titularManual, setTitularManual] = React.useState<Record<string, string>>({});
  const [desvinculando, setDesvinculando] = React.useState<string | null>(null);

  const refrescar = () => router.refresh();

  const opciones: ItemBuscable[] = clientes.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    detalle: `${c.lavados} lavados${c.vinculado ? " · ya vinculado" : ""}`,
    alias: [c.telefono],
  }));

  const buscadorPara = (dependienteId: string, etiqueta: string) => {
    const elegidoId = titularManual[dependienteId];
    return (
      <div className="space-y-1">
        <p className="etiqueta text-muted-foreground">{etiqueta}</p>
        <BuscadorCliente
          items={opciones.filter((o) => o.id !== dependienteId)}
          seleccionado={elegidoId ? (opciones.find((o) => o.id === elegidoId) ?? null) : null}
          onSeleccionar={(item) =>
            setTitularManual((prev) => {
              const siguiente = { ...prev };
              if (item) siguiente[dependienteId] = item.id;
              else delete siguiente[dependienteId];
              return siguiente;
            })
          }
          placeholder="Buscar el cliente titular…"
        />
      </div>
    );
  };

  const visibles = sugerencias.filter(
    (s) =>
      !descartadas.has(s.dependienteId) &&
      porId.has(s.dependienteId) &&
      porId.has(s.titularId)
  );
  const seguras = visibles.filter((s) => s.confianza === "alta");
  const aRevisar = visibles.filter((s) => s.confianza === "revisar");

  const pendientes = sinTitular.filter(
    (s) => !descartadas.has(s.clienteId) && porId.has(s.clienteId)
  );

  const tarjetaSugerencia = (s: SugerenciaVinculo) => {
    const elegidoId = titularManual[s.dependienteId] ?? s.titularId;
    const titular = porId.get(elegidoId) ?? null;
    const cambiado = elegidoId !== s.titularId;
    return (
      <FilaVinculo
        key={s.dependienteId}
        dependiente={porId.get(s.dependienteId)!}
        titular={titular}
        tipoInicial={s.tipo}
        nota={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={s.confianza === "alta" ? "success" : "warning"}>
              {s.confianza === "alta" ? "Claro" : "Revisar"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {cambiado ? `Anotado como "${s.palabra}"` : s.etiqueta}
            </span>
          </div>
        }
        aviso={
          titular?.vinculado || (s.titularOcupado && !cambiado)
            ? "El titular ya está vinculado con otro cliente. El vínculo es de a dos: desvinculalo primero o elegí otro titular."
            : undefined
        }
        buscador={buscadorPara(s.dependienteId, "Cambiar titular")}
        buscadorVisible={s.confianza === "revisar"}
        onDescartar={() =>
          setDescartadas((prev) => new Set(prev).add(s.dependienteId))
        }
        onHecho={refrescar}
      />
    );
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/admin/clientes">
          <ArrowLeft className="h-4 w-4" />
          Volver a clientes
        </Link>
      </Button>

      <Tabs defaultValue="sugerencias">
        <TabsList className="w-full">
          <TabsTrigger value="sugerencias" className="flex-1">
            Sugerencias {visibles.length > 0 && `(${visibles.length})`}
          </TabsTrigger>
          <TabsTrigger value="sin-titular" className="flex-1">
            Sin titular {pendientes.length > 0 && `(${pendientes.length})`}
          </TabsTrigger>
          <TabsTrigger value="cargados" className="flex-1">
            Cargados {vinculados.length > 0 && `(${vinculados.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sugerencias" className="space-y-4 pt-4">
          {visibles.length === 0 ? (
            <EstadoVacio
              titulo="No queda nada por vincular"
              descripcion="Ningún cliente pendiente está anotado por su relación con otro."
            />
          ) : (
            <>
              {seguras.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    El nombre anotado coincide exacto con un cliente.
                  </p>
                  {seguras.map(tarjetaSugerencia)}
                </div>
              )}
              {aRevisar.length > 0 && (
                <div className="space-y-3 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Acá hubo que interpretar el nombre. Verificá el titular antes de
                    vincular; si no es el que corresponde, cambialo.
                  </p>
                  {aRevisar.map(tarjetaSugerencia)}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="sin-titular" className="space-y-3 pt-4">
          <p className="text-sm text-muted-foreground">
            Están anotados por un parentesco pero no encontramos con quién. Elegí el
            titular a mano.
          </p>
          {pendientes.length === 0 ? (
            <EstadoVacio
              titulo="Nada pendiente"
              descripcion="Todos los parentescos del registro ya tienen titular."
            />
          ) : (
            pendientes.map((s) => {
              const elegidoId = titularManual[s.clienteId];
              return (
                <FilaVinculo
                  key={s.clienteId}
                  dependiente={porId.get(s.clienteId)!}
                  titular={elegidoId ? (porId.get(elegidoId) ?? null) : null}
                  tipoInicial={s.tipo}
                  nota={
                    <span className="text-xs text-muted-foreground">
                      Anotado como &ldquo;{s.palabra}&rdquo;
                      {s.buscado ? ` de "${s.buscado}", que no está en la base` : ""}
                    </span>
                  }
                  aviso={
                    elegidoId && porId.get(elegidoId)?.vinculado
                      ? "Ese cliente ya está vinculado con otro."
                      : undefined
                  }
                  buscador={buscadorPara(s.clienteId, "Titular")}
                  buscadorVisible
                  onDescartar={() =>
                    setDescartadas((prev) => new Set(prev).add(s.clienteId))
                  }
                  onHecho={refrescar}
                />
              );
            })
          )}
        </TabsContent>

        <TabsContent value="cargados" className="space-y-3 pt-4">
          {vinculados.length === 0 ? (
            <EstadoVacio
              titulo="Todavía no hay vínculos"
              descripcion="Cuando cargues uno, los dos clientes comparten los autos y toman el mejor nivel de los dos para los descuentos."
            />
          ) : (
            vinculados.map((v) => (
              <Card key={v.id}>
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/clientes/${v.id}`}
                      className="font-medium hover:underline"
                    >
                      {v.nombre}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Con {v.conNombre}
                      {v.tipo ? ` · ${TIPO_VINCULO_LABEL[v.tipo]}` : ""}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={desvinculando === v.id}
                    onClick={async () => {
                      setDesvinculando(v.id);
                      const r = await desvincularCliente(v.id);
                      setDesvinculando(null);
                      if (r?.error) toast.error(r.error);
                      else {
                        toast.success("Vínculo eliminado");
                        refrescar();
                      }
                    }}
                  >
                    <Link2Off className="h-4 w-4" />
                    Desvincular
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
