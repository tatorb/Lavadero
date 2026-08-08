import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { EstilosMarca } from "@/components/marca/estilos-marca";
import { LogoLavadero } from "@/components/marca/logo-lavadero";
import { LoginForm } from "@/app/login/login-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lavadero = await prisma.lavadero.findFirst({
    where: { slug, activo: true },
    select: { nombre: true },
  });
  return { title: lavadero?.nombre ?? "Lavadero" };
}

export default async function LoginDeMarca({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lavadero = await prisma.lavadero.findFirst({
    where: { slug, activo: true },
    select: {
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
      <link rel="manifest" href={`/l/${lavadero.slug}/manifest`} />
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <LogoLavadero
            logoUrl={lavadero.logoUrl}
            nombre={lavadero.nombre}
            size={72}
          />
          <h1 className="text-2xl font-bold">{lavadero.nombre}</h1>
          <p className="text-sm text-muted-foreground">
            Ingresá para ver tus lavados, pedir turnos y aprovechar tus beneficios
          </p>
        </div>
        <LoginForm />
        <p className="text-center text-sm text-muted-foreground">
          ¿Primera vez?{" "}
          <Link
            href={`/l/${lavadero.slug}/registro`}
            className="font-medium text-primary hover:underline"
          >
            Creá tu cuenta
          </Link>
        </p>
      </div>
    </main>
  );
}
