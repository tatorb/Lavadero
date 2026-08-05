import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { ImportacionesLista } from "./importaciones-lista";

export const metadata = { title: "Importaciones — Gestión" };

export default async function ImportacionesPage() {
  const user = await requireStaff();
  const batches = await prisma.importBatch.findMany({
    where: { lavaderoId: user.lavaderoId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importaciones</h1>
        <p className="text-sm text-muted-foreground">
          Lotes de importación masiva de datos históricos
        </p>
      </div>

      {batches.length === 0 ? (
        <Card>
          <CardContent className="space-y-2 p-6 text-sm text-muted-foreground">
            <p>Todavía no se importaron datos históricos en este lavadero.</p>
            <p>
              La importación se ejecuta por línea de comandos con vista previa,
              respaldo y posibilidad de deshacer:
            </p>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
              npx tsx scripts/import/bosquecito/run.ts --preview{"\n"}
              npx tsx scripts/import/bosquecito/run.ts --apply
            </pre>
          </CardContent>
        </Card>
      ) : (
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
        />
      )}
    </div>
  );
}
