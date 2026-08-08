import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { normalizarHex } from "@/lib/marca";

/**
 * Manifest PWA por lavadero: al instalar la app en el celular, el cliente ve
 * el logo y los colores de SU lavadero, no una marca genérica.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const lavadero = await prisma.lavadero.findFirst({
    where: { slug, activo: true },
    select: { nombre: true, logoUrl: true, colorPrimario: true },
  });

  if (!lavadero) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const color = normalizarHex(lavadero.colorPrimario) ?? "#2563eb";

  return NextResponse.json(
    {
      name: lavadero.nombre,
      short_name: lavadero.nombre.split(" ")[0],
      description: `Turnos, historial y beneficios de ${lavadero.nombre}`,
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: color,
      lang: "es-AR",
      icons: lavadero.logoUrl
        ? [
            {
              src: lavadero.logoUrl,
              sizes: "256x256",
              type: lavadero.logoUrl.startsWith("data:image/svg")
                ? "image/svg+xml"
                : "image/webp",
              purpose: "any",
            },
          ]
        : [],
    },
    { headers: { "Content-Type": "application/manifest+json" } }
  );
}
