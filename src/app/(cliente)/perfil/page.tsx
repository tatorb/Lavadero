import { Car, Flame, LogOut, Mail, Phone, Trophy, Users } from "lucide-react";

import { requireCliente } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { calcularNivel } from "@/lib/gamificacion/niveles";
import { cerrarSesion } from "@/server/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Mi perfil" };

export default async function PerfilPage() {
  const user = await requireCliente();
  const [cliente, niveles] = await Promise.all([
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
  ]);

  const estadoNivel = calcularNivel(cliente.puntosTotal, niveles);
  const nombreVinculado = cliente.vinculadoCon
    ? [cliente.vinculadoCon.nombre, cliente.vinculadoCon.apellido]
        .filter(Boolean)
        .join(" ")
    : null;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Mi perfil</h1>

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
          <div className="flex gap-2 pt-1">
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Car className="h-4 w-4" /> Mis autos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {cliente.autos.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-sm">
              <span>
                {a.marca} {a.modelo}
              </span>
              <span className="text-muted-foreground">{a.patente ?? "—"}</span>
            </div>
          ))}
          {cliente.autos.length === 0 && (
            <p className="text-sm text-muted-foreground">Sin autos cargados.</p>
          )}
        </CardContent>
      </Card>

      {cliente.vinculadoCon && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" /> Compartís cuenta con {nombreVinculado}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Pueden usar los autos del otro y comparten los beneficios del mejor
              nivel de los dos.
            </p>
            {cliente.vinculadoCon.autos.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span>
                  {a.marca} {a.modelo}
                </span>
                <span className="text-muted-foreground">{a.patente ?? "—"}</span>
              </div>
            ))}
          </CardContent>
        </Card>
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
