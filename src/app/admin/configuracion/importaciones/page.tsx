import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { ImportacionesLista } from "./importaciones-lista";

export const metadata = { title: "Importaciones — Gestión" };
// La importación masiva puede tardar más que el timeout default de Vercel
export const maxDuration = 300;

export default async function ImportacionesPage() {
  const user = await requireStaff();
  const batches = await prisma.importBatch.findMany({
    where: { lavaderoId: user.lavaderoId },
    orderBy: { createdAt: "desc" },
  });

  const hayAplicado = batches.some((b) => b.estado === "APLICADO");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importaciones</h1>
        <p className="text-sm text-muted-foreground">
          Lotes de importación masiva de datos históricos
        </p>
      </div>

      {batches.length === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Todavía no se importaron datos históricos en este lavadero.
          </CardContent>
        </Card>
      )}

      <ImportacionesLista
        batches={batches.map((b) => ({
          id: b.id,
          nombre: b.nombre,
          estado: b.estado,
          createdAt: b.createdAt.toISOString(),
          deshechoAt: b.deshechoAt?.toISOString() ?? null,
          resumen: (b.resumen as Record<string, number> | null) ?? null,
        }))}
        puedeDeshacer={user.rol === "ADMIN"}
        puedeImportar={user.rol === "ADMIN" && !hayAplicado}
      />
    </div>
  );
}
