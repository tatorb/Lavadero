import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { MarcaForm } from "./marca-form";

export const metadata = { title: "Marca — Gestión" };

export default async function MarcaPage() {
  const user = await requireStaff();
  const lavadero = await prisma.lavadero.findUniqueOrThrow({
    where: { id: user.lavaderoId },
    select: {
      nombre: true,
      slug: true,
      logoUrl: true,
      colorPrimario: true,
      tipografiaTexto: true,
      tipografiaTitulo: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Identidad de marca</h1>
        <p className="text-sm text-muted-foreground">
          El logo, los colores y la tipografía de {lavadero.nombre} en toda la app
        </p>
      </div>

      {user.rol !== "ADMIN" ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Solo un usuario administrador puede editar la marca del lavadero.
          </CardContent>
        </Card>
      ) : (
        <MarcaForm
          nombre={lavadero.nombre}
          slug={lavadero.slug}
          inicial={{
            logoUrl: lavadero.logoUrl,
            colorPrimario: lavadero.colorPrimario,
            tipografiaTexto: lavadero.tipografiaTexto,
            tipografiaTitulo: lavadero.tipografiaTitulo,
          }}
        />
      )}
    </div>
  );
}
