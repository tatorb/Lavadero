import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { sugerirVinculos } from "@/lib/clientes/vinculos";
import { VinculosClientes, type ClienteBreve } from "./vinculos-clientes";

export const metadata = { title: "Vínculos familiares — Gestión" };

export default async function VinculosPage() {
  const user = await requireStaff();

  const clientes = await prisma.cliente.findMany({
    where: { lavaderoId: user.lavaderoId, activo: true },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      telefono: true,
      vinculadoConId: true,
      vinculoTipo: true,
      _count: { select: { lavados: true, autos: true } },
    },
    orderBy: [{ nombre: "asc" }],
  });

  const { sugerencias, sinTitular } = sugerirVinculos(clientes);

  const fichas: ClienteBreve[] = clientes.map((c) => ({
    id: c.id,
    nombre: [c.nombre, c.apellido].filter(Boolean).join(" "),
    telefono: c.telefono,
    lavados: c._count.lavados,
    autos: c._count.autos,
    vinculado: !!c.vinculadoConId,
  }));

  // El vínculo vive en las dos filas: mostramos una sola por pareja
  const vistos = new Set<string>();
  const vinculados = [];
  for (const c of clientes) {
    if (!c.vinculadoConId || vistos.has(c.id)) continue;
    vistos.add(c.id);
    vistos.add(c.vinculadoConId);
    vinculados.push({
      id: c.id,
      nombre: [c.nombre, c.apellido].filter(Boolean).join(" "),
      conNombre: fichas.find((f) => f.id === c.vinculadoConId)?.nombre ?? "otro cliente",
      tipo: c.vinculoTipo,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vínculos familiares</h1>
        <p className="text-sm text-muted-foreground">
          En el registro hay gente anotada por su relación con otro cliente. Vinculalos
          para que compartan los autos y el nivel de descuentos.
        </p>
      </div>
      <VinculosClientes
        clientes={fichas}
        sugerencias={sugerencias}
        sinTitular={sinTitular}
        vinculados={vinculados}
      />
    </div>
  );
}
