"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export type EstadoAccion = { error?: string; ok?: boolean } | undefined;

const movimientoSchema = z.object({
  fecha: z.string().min(1, "Elegí la fecha"),
  tipo: z.enum(["INGRESO", "EGRESO"]),
  categoria: z.string().min(1, "Elegí una categoría"),
  concepto: z.string().min(2, "Describí el movimiento"),
  importe: z.coerce.number().positive("El importe debe ser mayor a 0"),
  formaPago: z.enum(["EFECTIVO", "TRANSFERENCIA", "MIXTO", "OTRO", "SIN_DATO"]),
  observaciones: z.string().optional(),
});

export async function crearMovimientoCaja(
  _prev: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  const user = await requireStaff();
  const parsed = movimientoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const fecha = new Date(`${parsed.data.fecha}T12:00:00`);
  if (Number.isNaN(fecha.getTime())) return { error: "Fecha inválida" };

  await prisma.movimientoCaja.create({
    data: { ...parsed.data, fecha, lavaderoId: user.lavaderoId },
  });
  revalidatePath("/admin/caja");
  return { ok: true };
}

export async function editarMovimientoCaja(
  id: string,
  _prev: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  const user = await requireStaff();
  const parsed = movimientoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const fecha = new Date(`${parsed.data.fecha}T12:00:00`);

  const { count } = await prisma.movimientoCaja.updateMany({
    where: { id, lavaderoId: user.lavaderoId },
    data: { ...parsed.data, fecha },
  });
  if (count === 0) return { error: "Movimiento no encontrado" };
  revalidatePath("/admin/caja");
  return { ok: true };
}

export async function eliminarMovimientoCaja(id: string): Promise<EstadoAccion> {
  const user = await requireStaff(["ADMIN"]);
  const { count } = await prisma.movimientoCaja.deleteMany({
    where: { id, lavaderoId: user.lavaderoId },
  });
  if (count === 0) return { error: "Movimiento no encontrado" };
  revalidatePath("/admin/caja");
  return { ok: true };
}
