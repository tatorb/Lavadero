import { Clock, Info } from "lucide-react";

import { formatMinutos, type Corte, type Duraciones } from "@/lib/metricas/duraciones";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const TRAMOS = [
  { clave: "espera" as const, label: "Espera", ayuda: "Llegada → inicio" },
  { clave: "lavado" as const, label: "Lavado", ayuda: "Inicio → fin" },
  { clave: "entrega" as const, label: "Entrega", ayuda: "Fin → entrega" },
  { clave: "total" as const, label: "Total", ayuda: "Llegada → entrega" },
];

function TablaCortes({ titulo, cortes }: { titulo: string; cortes: Corte[] }) {
  if (cortes.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="etiqueta">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-right">Lavado</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Más rápido</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Más lento</TableHead>
                <TableHead className="text-right">Muestra</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cortes.map(({ clave, duraciones }) => (
                <TableRow key={clave}>
                  <TableCell className="font-medium">{clave}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMinutos(duraciones.lavado)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
                    {formatMinutos(duraciones.lavadoMin)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
                    {formatMinutos(duraciones.lavadoMax)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {duraciones.muestra}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Cuánto tarda cada auto, por tramo, por servicio y por tipo de vehículo.
 * Deja afuera los lavados sin tiempos medidos y lo dice, para que nadie tome
 * el promedio por más representativo de lo que es.
 */
export function MetricasDuracion({
  dias,
  general,
  porServicio,
  porVehiculo,
  excluidos,
}: {
  dias: number;
  general: Duraciones;
  porServicio: Corte[];
  porVehiculo: Corte[];
  excluidos: number;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tiempos</h1>
        <p className="text-sm text-muted-foreground">
          Cuánto tarda un auto en el lavadero. Últimos {dias} días.
        </p>
      </div>

      {general.muestra === 0 ? (
        <EstadoVacio
          icono={<Clock className="h-5 w-5" />}
          titulo="Todavía no hay tiempos medidos"
          descripcion={
            excluidos > 0
              ? `Hay ${excluidos} lavados en el período, pero todos se cargaron sin medir los tiempos. Los que registres desde el tablero van a empezar a contar acá.`
              : "Cuando registres lavados desde el tablero, los promedios aparecen acá."
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {TRAMOS.map((t) => (
              <Card key={t.clave}>
                <CardContent className="pt-6">
                  <p className="etiqueta text-muted-foreground">{t.label}</p>
                  <p className="dato-lg">{formatMinutos(general[t.clave])}</p>
                  <p className="text-xs text-muted-foreground">{t.ayuda}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Promedios sobre {general.muestra}{" "}
              {general.muestra === 1 ? "lavado medido" : "lavados medidos"}.
              {excluidos > 0 && (
                <>
                  {" "}
                  Quedan afuera {excluidos} con tiempos estimados (importados del
                  registro viejo o cargados días después), para que no muevan el
                  promedio.
                </>
              )}
            </span>
          </p>

          <TablaCortes titulo="Por servicio" cortes={porServicio} />
          <TablaCortes titulo="Por tipo de vehículo" cortes={porVehiculo} />
        </>
      )}
    </div>
  );
}
