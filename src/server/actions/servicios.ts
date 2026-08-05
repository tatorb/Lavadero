"use server";

import { revalidatePath } from "next/cache";
import type { TipoVehiculo } from "@prisma/client";
import { z } from "zod";

import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

const TIPOS_VEHICULO: TipoVehiculo[] = [
  "AUTO",
  "SUV",
  "PICKUP",
  "PICKUP_GRANDE",
  "UTILITARIO",
  "UTILITARIO_GRANDE",
  "MOTO",
  "MOTORHOME",
  "UTV",
  "OTRO",
];

/** Lee del form los precios por tipo (campos precio_AUTO, precio_SUV, …). */
function preciosPorTipo(formData: FormData) {
  const precios: Array<{ tipoVehiculo: TipoVehiculo; precio: number }> = [];
  for (const tipo of TIPOS_VEHICULO) {
    const valor = formData.get(`precio_${tipo}`);
    if (typeof valor === "string" && valor.trim() !== "") {
      const n = Number(valor);
      if (!Number.isNaN(n) && n > 0) precios.push({ tipoVehiculo: tipo, precio: n });
    }
  }
  return precios;
}

async function guardarPrecios(
  servicioId: string,
  precios: Array<{ tipoVehiculo: TipoVehiculo; precio: number }>
) {
  await prisma.$transaction([
    prisma.precioServicio.deleteMany({ where: { servicioId } }),
    ...(precios.length
      ? [
          prisma.precioServicio.createMany({
            data: precios.map((p) => ({ ...p, servicioId })),
          }),
        ]
      : []),
  ]);
}

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

  const servicio = await prisma.servicio.create({
    data: {
      ...parsed.data,
      activo: true,
      orden: (maxOrden._max.orden ?? 0) + 1,
      lavaderoId: user.lavaderoId,
    },
  });
  await guardarPrecios(servicio.id, preciosPorTipo(formData));
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
  await guardarPrecios(id, preciosPorTipo(formData));
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
