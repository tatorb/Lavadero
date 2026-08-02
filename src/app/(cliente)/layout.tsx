import { requireCliente } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { BottomNav } from "@/components/cliente/bottom-nav";

export const metadata = { title: "Mi lavadero" };

export default async function ClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireCliente();
  const lavadero = await prisma.lavadero.findUnique({
    where: { id: user.lavaderoId },
    select: { nombre: true },
  });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <p className="text-xs text-muted-foreground">{lavadero?.nombre}</p>
        <p className="font-semibold">Hola, {user.nombre} 👋</p>
      </header>
      <main className="flex-1 px-4 py-4 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
