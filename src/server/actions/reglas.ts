"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { horaAMinutos } from "@/lib/format";

export type EstadoAccion = { error?: string; ok?: boolean } | undefined;

const reglaSchema = z
  .object({
    diaSemana: z.coerce.number().int().min(0).max(6),
    horaInicio: z.string().regex(/^\d{2}:\d{2}$/, "Hora de inicio inválida"),
    horaFin: z.string().regex(/^\d{2}:\d{2}$/, "Hora de fin inválida"),
    slotMin: z.coerce.number().int().min(10, "Slot mínimo 10 minutos"),
    capacidadPorSlot: z.coerce.number().int().min(1, "Capacidad mínima 1"),
    confirmacionAuto: z
      .string()
      .optional()
      .transform((v) => v === "on" || v === "true"),
    anticipacionMinHoras: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : null))
      .pipe(z.number().int().min(0).nullable()),
    anticipacionMaxDias: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : null))
      .pipe(z.number().int().min(1).nullable()),
  })
  .refine((d) => horaAMinutos(d.horaFin) > horaAMinutos(d.horaInicio), {
    message: "La hora de fin debe ser posterior a la de inicio",
  });

function aDatos(parsed: z.infer<typeof reglaSchema>) {
  return {
    diaSemana: parsed.diaSemana,
    horaInicio: horaAMinutos(parsed.horaInicio),
    horaFin: horaAMinutos(parsed.horaFin),
    slotMin: parsed.slotMin,
    capacidadPorSlot: parsed.capacidadPorSlot,
    confirmacionAuto: parsed.confirmacionAuto,
    anticipacionMinHoras: parsed.anticipacionMinHoras,
    anticipacionMaxDias: parsed.anticipacionMaxDias,
  };
}

export async function crearRegla(
  _prev: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  const user = await requireStaff(["ADMIN"]);
  const parsed = reglaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.reglaFranja.create({
    data: { ...aDatos(parsed.data), lavaderoId: user.lavaderoId },
  });
  revalidatePath("/admin/configuracion/franjas");
  return { ok: true };
}

export async function editarRegla(
  id: string,
  _prev: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  const user = await requireStaff(["ADMIN"]);
  const parsed = reglaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { count } = await prisma.reglaFranja.updateMany({
    where: { id, lavaderoId: user.lavaderoId },
    data: aDatos(parsed.data),
  });
  if (count === 0) return { error: "Regla no encontrada" };
  revalidatePath("/admin/configuracion/franjas");
  return { ok: true };
}

export async function eliminarRegla(id: string): Promise<EstadoAccion> {
  const user = await requireStaff(["ADMIN"]);
  const { count } = await prisma.reglaFranja.deleteMany({
    where: { id, lavaderoId: user.lavaderoId },
  });
  if (count === 0) return { error: "Regla no encontrada" };
  revalidatePath("/admin/configuracion/franjas");
  return { ok: true };
}

export async function toggleRegla(id: string): Promise<EstadoAccion> {
  const user = await requireStaff(["ADMIN"]);
  const regla = await prisma.reglaFranja.findFirst({
    where: { id, lavaderoId: user.lavaderoId },
  });
  if (!regla) return { error: "Regla no encontrada" };
  await prisma.reglaFranja.update({
    where: { id: regla.id },
    data: { activo: !regla.activo },
  });
  revalidatePath("/admin/configuracion/franjas");
  return { ok: true };
}
