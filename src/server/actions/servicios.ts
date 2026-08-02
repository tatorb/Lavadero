"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

const servicioSchema = z.object({
  nombre: z.string().min(2, "Nombre demasiado corto"),
  descripcion: z.string().optional(),
  precio: z.coerce.number().positive("El precio debe ser mayor a 0"),
  tipo: z.enum(["PRINCIPAL", "ADDON"]),
  duracionMin: z.coerce.number().int().min(5, "Duración mínima 5 minutos"),
  puntos: z.coerce.number().int().min(0),
  activo: z.coerce.boolean().optional(),
});

export type EstadoServicio = { error?: string; ok?: boolean } | undefined;

export async function crearServicio(
  _prev: EstadoServicio,
  formData: FormData
): Promise<EstadoServicio> {
  const user = await requireStaff(["ADMIN"]);
  const parsed = servicioSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const maxOrden = await prisma.servicio.aggregate({
    where: { lavaderoId: user.lavaderoId },
    _max: { orden: true },
  });

  await prisma.servicio.create({
    data: {
      ...parsed.data,
      activo: true,
      orden: (maxOrden._max.orden ?? 0) + 1,
      lavaderoId: user.lavaderoId,
    },
  });
  revalidatePath("/admin/servicios");
  return { ok: true };
}

export async function editarServicio(
  id: string,
  _prev: EstadoServicio,
  formData: FormData
): Promise<EstadoServicio> {
  const user = await requireStaff(["ADMIN"]);
  const parsed = servicioSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { count } = await prisma.servicio.updateMany({
    where: { id, lavaderoId: user.lavaderoId },
    data: parsed.data,
  });
  if (count === 0) return { error: "Servicio no encontrado" };
  revalidatePath("/admin/servicios");
  return { ok: true };
}

export async function toggleServicioActivo(id: string) {
  const user = await requireStaff(["ADMIN"]);
  const servicio = await prisma.servicio.findFirst({
    where: { id, lavaderoId: user.lavaderoId },
  });
  if (!servicio) return;
  await prisma.servicio.update({
    where: { id: servicio.id },
    data: { activo: !servicio.activo },
  });
  revalidatePath("/admin/servicios");
}
