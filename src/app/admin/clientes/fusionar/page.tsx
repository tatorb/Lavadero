import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { detectarDuplicados, pareceNoPersona } from "@/lib/clientes/duplicados";
import { FusionarClientes, type ClienteFicha } from "./fusionar-clientes";

export const metadata = { title: "Fusionar clientes — Gestión" };

export default async function FusionarPage() {
  const user = await requireStaff(["ADMIN"]);

  const clientes = await prisma.cliente.findMany({
    where: { lavaderoId: user.lavaderoId },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      telefono: true,
      email: true,
      detalles: true,
      puntosTotal: true,
      ultimaVisita: true,
      activo: true,
      passwordHash: true,
      vinculadoConId: true,
      _count: { select: { lavados: true, autos: true, turnos: true } },
    },
    orderBy: [{ nombre: "asc" }],
  });

  const fichas: ClienteFicha[] = clientes.map((c) => ({
    id: c.id,
    nombre: [c.nombre, c.apellido].filter(Boolean).join(" "),
    telefono: c.telefono,
    email: c.email,
    detalles: c.detalles,
    lavados: c._count.lavados,
    autos: c._count.autos,
    turnos: c._count.turnos,
    puntos: c.puntosTotal,
    ultimaVisita: c.ultimaVisita?.toISOString() ?? null,
    activo: c.activo,
    conCuenta: !!c.passwordHash,
    vinculado: !!c.vinculadoConId,
    alerta: pareceNoPersona([c.nombre, c.apellido].filter(Boolean).join(" ")),
  }));

  const pares = detectarDuplicados(
    clientes.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      apellido: c.apellido,
      telefono: c.telefono,
    })),
    { maxPares: 200 }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fusionar clientes</h1>
        <p className="text-sm text-muted-foreground">
          El mismo cliente puede haber quedado cargado varias veces con el nombre escrito
          distinto. Revisá las sugerencias y unificalos.
        </p>
      </div>
      <FusionarClientes clientes={fichas} pares={pares} />
    </div>
  );
}
