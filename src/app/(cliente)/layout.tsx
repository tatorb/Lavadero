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
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <LogoLavadero
          logoUrl={lavadero?.logoUrl ?? null}
          nombre={lavadero?.nombre ?? "Lavadero"}
          size={40}
        />
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{lavadero?.nombre}</p>
          <p className="truncate font-semibold">Hola, {user.nombre} 👋</p>
        </div>
      </header>
      <main className="flex-1 px-4 py-4 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
