"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ItemBuscable {
  id: string;
  nombre: string;
  /** Línea chica bajo el nombre: lavados, teléfono, lo que sirva para desempatar */
  detalle?: string;
  /** Texto extra por el que también se puede buscar (teléfono, email) */
  alias?: Array<string | null | undefined>;
}

/**
 * Buscador de un cliente entre muchos. Con 300 clientes un `<select>` es
 * inusable en el celular, así que filtra a medida que se escribe y muestra
 * pocos resultados.
 */
export function BuscadorCliente({
  items,
  seleccionado,
  onSeleccionar,
  placeholder,
  maxResultados = 8,
}: {
  items: ItemBuscable[];
  seleccionado: ItemBuscable | null;
  onSeleccionar: (item: ItemBuscable | null) => void;
  placeholder: string;
  maxResultados?: number;
}) {
  const [busqueda, setBusqueda] = React.useState("");

  if (seleccionado) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-primary bg-primary/5 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{seleccionado.nombre}</p>
          {seleccionado.detalle && (
            <p className="text-xs text-muted-foreground">{seleccionado.detalle}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Quitar selección"
          onClick={() => onSeleccionar(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const termino = busqueda.trim().toLowerCase();
  const resultados = termino
    ? items
        .filter((item) =>
          [item.nombre, ...(item.alias ?? [])]
            .filter(Boolean)
            .some((v) => v!.toLowerCase().includes(termino))
        )
        .slice(0, maxResultados)
    : [];

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>
      {resultados.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => {
            onSeleccionar(item);
            setBusqueda("");
          }}
          className="flex w-full items-center justify-between gap-2 rounded-lg border p-2 text-left text-sm transition hover:bg-accent active:scale-[0.99]"
        >
          <span className="truncate">{item.nombre}</span>
          {item.detalle && (
            <span className="shrink-0 text-xs text-muted-foreground">{item.detalle}</span>
          )}
        </button>
      ))}
    </div>
  );
}
