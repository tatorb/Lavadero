import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { FranjasConfig } from "./franjas-config";

export const metadata = { title: "Franjas horarias — Gestión" };

export default async function FranjasPage() {
  const user = await requireStaff();
  const reglas = await prisma.reglaFranja.findMany({
    where: { lavaderoId: user.lavaderoId },
    orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Franjas horarias</h1>
        <p className="text-sm text-muted-foreground">
          Reglas que definen cuándo y cómo los clientes pueden reservar turnos
        </p>
      </div>
      <FranjasConfig
        reglas={reglas.map((r) => ({
          id: r.id,
          diaSemana: r.diaSemana,
          horaInicio: r.horaInicio,
          horaFin: r.horaFin,
          slotMin: r.slotMin,
          capacidadPorSlot: r.capacidadPorSlot,
          confirmacionAuto: r.confirmacionAuto,
          anticipacionMinHoras: r.anticipacionMinHoras,
          anticipacionMaxDias: r.anticipacionMaxDias,
          activo: r.activo,
        }))}
        puedeEditar={user.rol === "ADMIN"}
      />
    </div>
  );
}
