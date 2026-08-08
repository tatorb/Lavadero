import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { EstilosMarca } from "@/components/marca/estilos-marca";
import { LogoLavadero } from "@/components/marca/logo-lavadero";
import { RegistroForm } from "@/app/registro/registro-form";

export const dynamic = "force-dynamic";

export default async function RegistroDeMarca({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lavadero = await prisma.lavadero.findFirst({
    where: { slug, activo: true },
    select: {
      id: true,
      nombre: true,
      slug: true,
      logoUrl: true,
      colorPrimario: true,
      tipografiaTexto: true,
      tipografiaTitulo: true,
    },
  });
  if (!lavadero) notFound();

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-muted/40 p-4">
      <EstilosMarca
        marca={{
          logoUrl: lavadero.logoUrl,
          colorPrimario: lavadero.colorPrimario,
          tipografiaTexto: lavadero.tipografiaTexto,
          tipografiaTitulo: lavadero.tipografiaTitulo,
        }}
      />
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <LogoLavadero
            logoUrl={lavadero.logoUrl}
            nombre={lavadero.nombre}
            size={64}
          />
          <h1 className="text-2xl font-bold">Creá tu cuenta</h1>
          <p className="text-sm text-muted-foreground">
            Sumate a {lavadero.nombre} y empezá a acumular puntos con cada lavado
          </p>
        </div>
        {/* El lavadero ya está determinado por el link: no hay que elegirlo */}
        <RegistroForm
          lavaderos={[{ id: lavadero.id, nombre: lavadero.nombre }]}
          lavaderoFijo
        />
        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tenés cuenta?{" "}
          <Link
            href={`/l/${lavadero.slug}`}
            className="font-medium text-primary hover:underline"
          >
            Iniciá sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
