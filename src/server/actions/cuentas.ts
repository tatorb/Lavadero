"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export type EstadoAccion = { error?: string; ok?: boolean } | undefined;

const pagoSchema = z.object({
  importe: z.coerce.number().positive("El importe debe ser mayor a 0"),
  observaciones: z.string().optional(),
});

/** Registra un pago del cliente contra su deuda (o a cuenta). */
export async function registrarPagoCuenta(
  clienteId: string,
  _prev: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  const user = await requireStaff();
  const parsed = pagoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, lavaderoId: user.lavaderoId },
  });
  if (!cliente) return { error: "Cliente no encontrado" };

  await prisma.movimientoCuenta.create({
    data: {
      lavaderoId: user.lavaderoId,
      clienteId,
      fecha: new Date(),
      tipo: "PAGO",
      importe: parsed.data.importe,
      observaciones: parsed.data.observaciones,
    },
  });
  revalidatePath(`/admin/clientes/${clienteId}`);
  return { ok: true };
}

const ajusteSchema = z.object({
  importe: z.coerce
    .number()
    .refine((n) => n !== 0, "El importe no puede ser 0"),
  observaciones: z.string().min(3, "Explicá el motivo del ajuste"),
});

/** Ajuste manual del saldo (positivo suma a favor, negativo genera deuda). */
export async function registrarAjusteCuenta(
  clienteId: string,
  _prev: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  const user = await requireStaff(["ADMIN"]);
  const parsed = ajusteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, lavaderoId: user.lavaderoId },
  });
  if (!cliente) return { error: "Cliente no encontrado" };

  await prisma.movimientoCuenta.create({
    data: {
      lavaderoId: user.lavaderoId,
      clienteId,
      fecha: new Date(),
      tipo: "AJUSTE",
      importe: parsed.data.importe,
      observaciones: parsed.data.observaciones,
    },
  });
  revalidatePath(`/admin/clientes/${clienteId}`);
  return { ok: true };
}
