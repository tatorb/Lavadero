import Link from "next/link";

import { requireCliente } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { BottomNav } from "@/components/cliente/bottom-nav";
import { EstilosMarca } from "@/components/marca/estilos-marca";
import { LogoLavadero } from "@/components/marca/logo-lavadero";

export const metadata = { title: "Mi lavadero" };

export default async function ClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireCliente();
  const lavadero = await prisma.lavadero.findUnique({
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
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-muted/30">
      {lavadero && (
        <>
          <EstilosMarca
            marca={{
              logoUrl: lavadero.logoUrl,
              colorPrimario: lavadero.colorPrimario,
              tipografiaTexto: lavadero.tipografiaTexto,
              tipografiaTitulo: lavadero.tipografiaTitulo,
            }}
          />
          {/* Al instalar la app en el celular usa el logo y color del lavadero */}
          <link rel="manifest" href={`/l/${lavadero.slug}/manifest`} />
        </>
      )}
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur">
        <LogoLavadero
          logoUrl={lavadero?.logoUrl ?? null}
          nombre={lavadero?.nombre ?? "Lavadero"}
          size={36}
        />
        <p className="min-w-0 flex-1 truncate font-semibold">{lavadero?.nombre}</p>
        <Link
          href="/perfil"
          aria-label="Mi perfil"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary transition-transform duration-100 active:scale-90"
        >
          {user.nombre.charAt(0).toUpperCase()}
        </Link>
      </header>
      <main className="flex-1 px-4 py-4 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
