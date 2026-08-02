"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { otorgarPuntosLavado } from "@/lib/gamificacion/puntos";

export type EstadoAccion = { error?: string; ok?: boolean; id?: string } | undefined;

const crearLavadoSchema = z.object({
  clienteId: z.string().min(1, "Elegí un cliente"),
  autoId: z.string().min(1, "Elegí un auto"),
  servicioId: z.string().min(1, "Elegí un servicio"),
  addonIds: z.array(z.string()).optional(),
  detalles: z.string().optional(),
  turnoId: z.string().optional(),
});

/**
 * Registra la llegada de un auto al lavadero (crea el Lavado con llegadaAt=ahora).
 * Si viene de un turno, lo marca COMPLETADO y lo enlaza.
 */
export async function crearLavado(input: z.infer<typeof crearLavadoSchema>): Promise<EstadoAccion> {
  const user = await requireStaff();
  const parsed = crearLavadoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const [cliente, auto, servicio] = await Promise.all([
    prisma.cliente.findFirst({
      where: { id: data.clienteId, lavaderoId: user.lavaderoId },
      include: { vinculadoCon: { select: { id: true } } },
    }),
    prisma.auto.findFirst({ where: { id: data.autoId, lavaderoId: user.lavaderoId } }),
    prisma.servicio.findFirst({
      where: { id: data.servicioId, lavaderoId: user.lavaderoId, tipo: "PRINCIPAL" },
    }),
  ]);
  if (!cliente) return { error: "Cliente no encontrado" };
  if (!auto) return { error: "Auto no encontrado" };
  if (!servicio) return { error: "Servicio no encontrado" };

  // El auto debe ser del cliente o de su vinculado
  const duenosValidos = [cliente.id, cliente.vinculadoCon?.id].filter(Boolean);
  if (!duenosValidos.includes(auto.clienteId)) {
    return { error: "El auto no pertenece al cliente ni a su vinculado" };
  }

  const addons = data.addonIds?.length
    ? await prisma.servicio.findMany({
        where: {
          id: { in: data.addonIds },
          lavaderoId: user.lavaderoId,
          tipo: "ADDON",
        },
      })
    : [];

  if (data.turnoId) {
    const turno = await prisma.turno.findFirst({
      where: { id: data.turnoId, lavaderoId: user.lavaderoId, lavado: null },
    });
    if (!turno) return { error: "Turno no encontrado o ya tiene un lavado asociado" };
  }

  const precioFinal =
    servicio.precio.toNumber() + addons.reduce((sum, a) => sum + a.precio.toNumber(), 0);

  const lavado = await prisma.$transaction(async (tx) => {
    const creado = await tx.lavado.create({
      data: {
        lavaderoId: user.lavaderoId,
        clienteId: cliente.id,
        autoId: auto.id,
        servicioId: servicio.id,
        turnoId: data.turnoId,
        llegadaAt: new Date(),
        detalles: data.detalles,
        precioFinal,
        addons: {
          create: addons.map((a) => ({ servicioId: a.id, precio: a.precio })),
        },
      },
    });
    if (data.turnoId) {
      await tx.turno.update({
        where: { id: data.turnoId },
        data: { estado: "COMPLETADO" },
      });
    }
    return creado;
  });

  revalidatePath("/admin/lavados");
  revalidatePath("/admin/turnos");
  return { ok: true, id: lavado.id };
}

export async function iniciarLavado(id: string): Promise<EstadoAccion> {
  const user = await requireStaff();
  const { count } = await prisma.lavado.updateMany({
    where: { id, lavaderoId: user.lavaderoId, inicioAt: null },
    data: { inicioAt: new Date() },
  });
  if (count === 0) return { error: "El lavado no existe o ya fue iniciado" };
  revalidatePath(`/admin/lavados/${id}`);
  revalidatePath("/admin/lavados");
  return { ok: true };
}

/**
 * Finaliza el lavado y dispara la gamificación (puntos + racha) en una
 * transacción. Idempotente: finalizar dos veces no duplica puntos.
 */
export async function finalizarLavado(id: string): Promise<EstadoAccion> {
  const user = await requireStaff();
  const lavado = await prisma.lavado.findFirst({
    where: { id, lavaderoId: user.lavaderoId },
  });
  if (!lavado) return { error: "Lavado no encontrado" };
  if (!lavado.inicioAt) return { error: "El lavado todavía no fue iniciado" };
  if (lavado.finAt) return { error: "El lavado ya fue finalizado" };

  const finAt = new Date();
  await prisma.$transaction((tx) => otorgarPuntosLavado(tx, lavado.id, finAt));

  revalidatePath(`/admin/lavados/${id}`);
  revalidatePath("/admin/lavados");
  revalidatePath(`/admin/clientes/${lavado.clienteId}`);
  return { ok: true };
}

export async function editarDetallesLavado(
  id: string,
  detalles: string
): Promise<EstadoAccion> {
  const user = await requireStaff();
  const { count } = await prisma.lavado.updateMany({
    where: { id, lavaderoId: user.lavaderoId },
    data: { detalles },
  });
  if (count === 0) return { error: "Lavado no encontrado" };
  revalidatePath(`/admin/lavados/${id}`);
  return { ok: true };
}
