import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { LavadosTable } from "./lavados-table";

export const metadata = { title: "Lavados — Gestión" };

export default async function LavadosPage() {
  const user = await requireStaff();

  const [lavados, clientes, servicios] = await Promise.all([
    prisma.lavado.findMany({
      where: { lavaderoId: user.lavaderoId },
      include: { cliente: true, auto: true, servicio: true },
      orderBy: { llegadaAt: "desc" },
      take: 200,
    }),
    prisma.cliente.findMany({
      where: { lavaderoId: user.lavaderoId, activo: true },
      include: {
        autos: { where: { activo: true } },
        vinculadoCon: { include: { autos: { where: { activo: true } } } },
      },
      orderBy: { nombre: "asc" },
    }),
    prisma.servicio.findMany({
      where: { lavaderoId: user.lavaderoId, activo: true },
      orderBy: { orden: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lavados</h1>
        <p className="text-sm text-muted-foreground">
          Historial completo de lavados del lavadero
        </p>
      </div>
      <LavadosTable
        lavados={lavados.map((l) => ({
          id: l.id,
          fecha: l.llegadaAt.toISOString(),
          cliente: [l.cliente.nombre, l.cliente.apellido].filter(Boolean).join(" "),
          auto: `${l.auto.marca} ${l.auto.modelo} (${l.auto.patente})`,
          servicio: l.servicio.nombre,
          precio: l.precioFinal?.toNumber() ?? null,
          estado: l.finAt ? "finalizado" : l.inicioAt ? "en_curso" : "en_espera",
        }))}
        clientes={clientes.map((c) => ({
          id: c.id,
          nombre: [c.nombre, c.apellido].filter(Boolean).join(" "),
          autos: [
            ...c.autos.map((a) => ({
              id: a.id,
              label: `${a.marca} ${a.modelo} (${a.patente})`,
            })),
            ...(c.vinculadoCon?.autos.map((a) => ({
              id: a.id,
              label: `${a.marca} ${a.modelo} (${a.patente}) — de ${c.vinculadoCon!.nombre}`,
            })) ?? []),
          ],
        }))}
        servicios={servicios.map((s) => ({
          id: s.id,
          nombre: s.nombre,
          precio: s.precio.toNumber(),
          tipo: s.tipo,
        }))}
      />
    </div>
  );
}
