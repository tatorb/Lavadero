"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { FUENTES, normalizarHex } from "@/lib/marca";

export type EstadoAccion = { error?: string; ok?: boolean } | undefined;

const CLAVES_FUENTE = FUENTES.map((f) => f.key) as [string, ...string[]];

/** Tope del logo embebido (~200 KB de data URI); el navegador ya lo optimiza antes. */
const MAX_LOGO = 200_000;

const marcaSchema = z.object({
  logoUrl: z
    .string()
    .max(MAX_LOGO, "El logo es demasiado grande")
    .refine(
      (v) => v === "" || /^data:image\/(png|jpeg|webp|svg\+xml);base64,/.test(v) || /^https:\/\//.test(v),
      "Formato de logo no válido"
    )
    .nullable()
    .optional(),
  colorPrimario: z.string().nullable().optional(),
  tipografiaTexto: z.enum(CLAVES_FUENTE),
  tipografiaTitulo: z.enum(CLAVES_FUENTE).nullable().optional(),
});

export async function guardarMarca(
  input: z.infer<typeof marcaSchema>
): Promise<EstadoAccion> {
  const user = await requireStaff(["ADMIN"]);
  const parsed = marcaSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const color = normalizarHex(data.colorPrimario);
  if (data.colorPrimario && !color) return { error: "El color no es un hex válido" };

  await prisma.lavadero.update({
    where: { id: user.lavaderoId },
    data: {
      logoUrl: data.logoUrl ? data.logoUrl : null,
      colorPrimario: color,
      tipografiaTexto: data.tipografiaTexto,
      tipografiaTitulo: data.tipografiaTitulo || null,
    },
  });

  // La marca afecta a todas las superficies
  revalidatePath("/", "layout");
  return { ok: true };
}
