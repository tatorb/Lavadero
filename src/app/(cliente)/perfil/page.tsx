import { Car, Flame, LogOut, Mail, Phone, Trophy, Users } from "lucide-react";

import { requireCliente } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { TIPO_VEHICULO_LABEL } from "@/lib/format";
import { calcularNivel } from "@/lib/gamificacion/niveles";
import { cerrarSesion } from "@/server/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EstadoVacio } from "@/components/ui/estado-vacio";

export const metadata = { title: "Mi perfil" };

export default async function PerfilPage() {
  const user = await requireCliente();
  const [cliente, niveles, porAuto] = await Promise.all([
    prisma.cliente.findUniqueOrThrow({
      where: { id: user.id },
      include: {
        autos: { where: { activo: true } },
        vinculadoCon: {
          select: { nombre: true, apellido: true, autos: { where: { activo: true } } },
        },
      },
    }),
    prisma.nivel.findMany({
      where: { lavaderoId: user.lavaderoId, activo: true },
      orderBy: { puntosMin: "asc" },
    }),
    // Telemetría por auto: cuántos lavados lleva cada uno
    prisma.lavado.groupBy({
      by: ["autoId"],
      where: { clienteId: user.id, canceladoAt: null },
      _count: true,
    }),
  ]);

  const lavadosPorAuto = new Map(porAuto.map((l) => [l.autoId, l._count]));
  const estadoNivel = calcularNivel(cliente.puntosTotal, niveles);
  const nombreVinculado = cliente.vinculadoCon
    ? [cliente.vinculadoCon.nombre, cliente.vinculadoCon.apellido]
        .filter(Boolean)
        .join(" ")
    : null;

  const FilaAuto = ({
    auto,
    ajeno,
  }: {
    auto: {
      id: string;
      marca: string;
      modelo: string;
      patente: string | null;
      tipo: string;
    };
    ajeno?: boolean;
  }) => {
    const lavados = lavadosPorAuto.get(auto.id) ?? 0;
    return (
      <div className="flex items-center gap-3 py-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Car className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {auto.marca !== "—" ? `${auto.marca} ` : ""}
            {auto.modelo}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {auto.patente ?? TIPO_VEHICULO_LABEL[auto.tipo]}
            {!ajeno && lavados > 0 && ` · ${lavados} ${lavados === 1 ? "lavado" : "lavados"}`}
          </p>
        </div>
        <Badge variant="muted">{TIPO_VEHICULO_LABEL[auto.tipo] ?? auto.tipo}</Badge>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Mi perfil</h1>

      <Card>
        <CardContent className="space-y-2 p-4 text-sm">
          <p className="text-base font-semibold">
            {[cliente.nombre, cliente.apellido].filter(Boolean).join(" ")}
          </p>
          {cliente.telefono && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" /> {cliente.telefono}
            </p>
          )}
          {cliente.email && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" /> {cliente.email}
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="secondary">
              <Trophy className="mr-1 h-3 w-3" />
              {estadoNivel.nivelActual?.nombre} · {cliente.puntosTotal} pts
            </Badge>
            <Badge variant="secondary">
              <Flame className="mr-1 h-3 w-3" />
              Racha {cliente.rachaActual} (mejor: {cliente.mejorRacha})
            </Badge>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-2">
        <h2 className="etiqueta">Mis autos</h2>
        {cliente.autos.length === 0 ? (
          <EstadoVacio
            icono={<Car className="h-5 w-5" />}
            titulo="Sin autos cargados"
            descripcion="Pedile al lavadero que agregue tu vehículo y vas a poder reservar turnos desde acá."
          />
        ) : (
          <Card>
            <CardContent className="divide-y px-4 py-1">
              {cliente.autos.map((a) => (
                <FilaAuto key={a.id} auto={a} />
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      {cliente.vinculadoCon && (
        <section className="space-y-2">
          <h2 className="etiqueta flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Compartís cuenta con {nombreVinculado}
          </h2>
          <Card>
            <CardContent className="px-4 py-3">
              <p className="pb-1 text-xs text-muted-foreground">
                Pueden usar los autos del otro y comparten los beneficios del mejor
                nivel de los dos.
              </p>
              <div className="divide-y">
                {cliente.vinculadoCon.autos.map((a) => (
                  <FilaAuto key={a.id} auto={a} ajeno />
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      <form action={cerrarSesion}>
        <Button variant="outline" className="w-full" type="submit">
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </form>
    </div>
  );
}
