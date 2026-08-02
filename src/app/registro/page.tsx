import Link from "next/link";
import { Droplets } from "lucide-react";

import { prisma } from "@/lib/db";
import { RegistroForm } from "./registro-form";

export const metadata = { title: "Crear cuenta — Lavadero" };
export const dynamic = "force-dynamic";

export default async function RegistroPage() {
  const lavaderos = await prisma.lavadero.findMany({
    where: { activo: true },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Droplets className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Crear cuenta</h1>
          <p className="text-sm text-muted-foreground">
            Sumate y empezá a acumular puntos con cada lavado
          </p>
        </div>
        <RegistroForm lavaderos={lavaderos} />
        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
