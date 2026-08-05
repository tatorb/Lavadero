"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export type EstadoAccion = { error?: string; ok?: boolean } | undefined;

/**
 * Deshace un lote de importación completo: elimina clientes, autos, lavados,
 * movimientos de caja y de cuenta creados por el lote.
 */
export async function deshacerImportacion(batchId: string): Promise<EstadoAccion> {
  const user = await requireStaff(["ADMIN"]);
  const batch = await prisma.importBatch.findFirst({
    where: { id: batchId, lavaderoId: user.lavaderoId },
  });
  if (!batch) return { error: "Lote no encontrado" };
  if (batch.estado === "DESHECHO") return { error: "El lote ya fue deshecho" };

  const clientes = await prisma.cliente.findMany({
    where: { importBatchId: batchId },
    select: { id: true },
  });
  const clienteIds = clientes.map((c) => c.id);

  await prisma.$transaction([
    prisma.puntosMovimiento.deleteMany({ where: { clienteId: { in: clienteIds } } }),
    prisma.movimientoCuenta.deleteMany({ where: { importBatchId: batchId } }),
    prisma.movimientoCaja.deleteMany({ where: { importBatchId: batchId } }),
    prisma.lavado.deleteMany({ where: { importBatchId: batchId } }),
    prisma.turno.deleteMany({ where: { clienteId: { in: clienteIds } } }),
    prisma.auto.deleteMany({ where: { importBatchId: batchId } }),
    prisma.cliente.deleteMany({ where: { id: { in: clienteIds } } }),
    prisma.importBatch.update({
      where: { id: batchId },
      data: { estado: "DESHECHO", deshechoAt: new Date() },
    }),
  ]);

  revalidatePath("/admin/configuracion/importaciones");
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/lavados");
  revalidatePath("/admin/caja");
  return { ok: true };
}
