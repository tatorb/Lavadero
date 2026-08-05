"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { otorgarPuntosLavado } from "@/lib/gamificacion/puntos";
import { precioParaTipo } from "@/lib/precios";

export type EstadoAccion = { error?: string; ok?: boolean; id?: string } | undefined;

const crearLavadoSchema = z.object({
  clienteId: z.string().min(1, "Elegí un cliente"),
  autoId: z.string().min(1, "Elegí un auto"),
  servicioId: z.string().min(1, "Elegí un servicio"),
  addonIds: z.array(z.string()).optional(),
  detalles: z.string().optional(),
  turnoId: z.string().optional(),
  /** ISO UTC de la llegada; si falta se usa ahora (permite cargar lavados de otros días) */
  llegadaISO: z.string().optional(),
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
      include: { precios: true },
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
        include: { precios: true },
      })
    : [];

  if (data.turnoId) {
    const turno = await prisma.turno.findFirst({
      where: { id: data.turnoId, lavaderoId: user.lavaderoId, lavado: null },
    });
    if (!turno) return { error: "Turno no encontrado o ya tiene un lavado asociado" };
  }

  // Precio de lista según el tipo de vehículo del auto
  // Precio de lista según el tipo de vehículo del auto
  const precioFinal =
    precioParaTipo(servicio, auto.tipo) +
    addons.reduce((sum, a) => sum + precioParaTipo(a, auto.tipo), 0);

  let llegadaAt = new Date();
  if (data.llegadaISO) {
    llegadaAt = new Date(data.llegadaISO);
    if (Number.isNaN(llegadaAt.getTime())) return { error: "Fecha de llegada inválida" };
    if (llegadaAt.getTime() > Date.now() + 60 * 60 * 1000) {
      return { error: "La llegada no puede ser en el futuro" };
    }
  }

  const lavado = await prisma.$transaction(async (tx) => {
    const creado = await tx.lavado.create({
      data: {
        lavaderoId: user.lavaderoId,
        clienteId: cliente.id,
        autoId: auto.id,
        servicioId: servicio.id,
        turnoId: data.turnoId,
        llegadaAt,
        detalles: data.detalles,
        precioFinal,
        addons: {
          create: addons.map((a) => ({
            servicioId: a.id,
            precio: precioParaTipo(a, auto.tipo),
          })),
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
  const lavado = await prisma.lavado.findFirst({
    where: { id, lavaderoId: user.lavaderoId, inicioAt: null },
  });
  if (!lavado) return { error: "El lavado no existe o ya fue iniciado" };
  // Lavado cargado con fecha pasada: el inicio acompaña a la llegada
  const esRetroactivo = Date.now() - lavado.llegadaAt.getTime() > 12 * 60 * 60 * 1000;
  await prisma.lavado.update({
    where: { id: lavado.id },
    data: { inicioAt: esRetroactivo ? lavado.llegadaAt : new Date() },
  });
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

  // Lavado cargado con fecha pasada: el fin (y la gamificación) usan esa fecha
  const esRetroactivo = Date.now() - lavado.llegadaAt.getTime() > 12 * 60 * 60 * 1000;
  const finAt = esRetroactivo
    ? new Date(lavado.llegadaAt.getTime() + 45 * 60 * 1000)
    : new Date();
  await prisma.$transaction((tx) => otorgarPuntosLavado(tx, lavado.id, finAt));

  revalidatePath(`/admin/lavados/${id}`);
  revalidatePath("/admin/lavados");
  revalidatePath(`/admin/clientes/${lavado.clienteId}`);
  return { ok: true };
}

/** Marca la entrega del vehículo al cliente. */
export async function entregarLavado(id: string): Promise<EstadoAccion> {
  const user = await requireStaff();
  const { count } = await prisma.lavado.updateMany({
    where: {
      id,
      lavaderoId: user.lavaderoId,
      finAt: { not: null },
      entregadoAt: null,
      canceladoAt: null,
    },
    data: { entregadoAt: new Date() },
  });
  if (count === 0) return { error: "El lavado no está finalizado o ya fue entregado" };
  revalidatePath(`/admin/lavados/${id}`);
  revalidatePath("/admin/lavados");
  return { ok: true };
}

/** Cancela un lavado que todavía no fue finalizado. */
export async function cancelarLavado(id: string): Promise<EstadoAccion> {
  const user = await requireStaff();
  const { count } = await prisma.lavado.updateMany({
    where: { id, lavaderoId: user.lavaderoId, finAt: null, canceladoAt: null },
    data: { canceladoAt: new Date() },
  });
  if (count === 0) return { error: "El lavado no se puede cancelar" };
  revalidatePath(`/admin/lavados/${id}`);
  revalidatePath("/admin/lavados");
  return { ok: true };
}

const cobroSchema = z.object({
  importe: z.coerce.number().min(0),
  formaPago: z.enum(["EFECTIVO", "TRANSFERENCIA", "MIXTO", "OTRO", "SIN_DATO"]),
  pagos: z
    .array(
      z.object({
        medio: z.enum(["EFECTIVO", "TRANSFERENCIA", "OTRO"]),
        importe: z.coerce.number().positive(),
      })
    )
    .optional(),
  esCortesia: z.boolean().optional(),
  // Qué hacer con la diferencia contra el precio de lista
  tratamientoFaltante: z.enum(["DEUDA", "BONIFICADO"]).optional(),
  tratamientoSobrante: z.enum(["SALDO_A_FAVOR", "PROPINA"]).optional(),
  motivo: z.string().optional(),
});

/**
 * Registra (o corrige) el cobro de un lavado. Según la diferencia con el
 * precio de lista genera deuda o saldo a favor en la cuenta corriente del
 * cliente. Re-ejecutarlo reemplaza el cobro anterior.
 */
export async function registrarCobro(
  lavadoId: string,
  input: z.infer<typeof cobroSchema>
): Promise<EstadoAccion> {
  const user = await requireStaff();
  const parsed = cobroSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const lavado = await prisma.lavado.findFirst({
    where: { id: lavadoId, lavaderoId: user.lavaderoId, canceladoAt: null },
  });
  if (!lavado) return { error: "Lavado no encontrado" };
  if (lavado.precioFinal == null) return { error: "El lavado no tiene precio de lista" };
  const precioLista = lavado.precioFinal.toNumber();

  if (data.formaPago === "MIXTO") {
    const suma = (data.pagos ?? []).reduce((s, p) => s + p.importe, 0);
    if (!data.pagos?.length || Math.abs(suma - data.importe) > 0.01) {
      return { error: "Los medios del pago mixto no suman el importe cobrado" };
    }
  }

  await prisma.$transaction(async (tx) => {
    // Reemplaza cobro anterior: limpia pagos y movimientos generados por este lavado
    await tx.pago.deleteMany({ where: { lavadoId } });
    await tx.movimientoCuenta.deleteMany({
      where: { lavadoId, tipo: { in: ["DEUDA", "SALDO_A_FAVOR", "CORTESIA"] } },
    });

    if (data.esCortesia) {
      await tx.lavado.update({
        where: { id: lavadoId },
        data: {
          importeCobrado: 0,
          estadoPago: "CORTESIA",
          formaPago: "SIN_DATO",
          motivoAjuste: data.motivo || "Cortesía",
        },
      });
      await tx.movimientoCuenta.create({
        data: {
          lavaderoId: user.lavaderoId,
          clienteId: lavado.clienteId,
          fecha: new Date(),
          tipo: "CORTESIA",
          importe: precioLista,
          lavadoId,
          observaciones: data.motivo || "Lavado de cortesía",
        },
      });
      return;
    }

    const diferencia = data.importe - precioLista;
    let estadoPago: "PAGADO" | "PARCIAL" | "BONIFICADO" = "PAGADO";

    if (diferencia < -0.01) {
      if (data.tratamientoFaltante === "DEUDA") {
        estadoPago = "PARCIAL";
        await tx.movimientoCuenta.create({
          data: {
            lavaderoId: user.lavaderoId,
            clienteId: lavado.clienteId,
            fecha: new Date(),
            tipo: "DEUDA",
            importe: -diferencia,
            lavadoId,
            observaciones: data.motivo || "Diferencia pendiente del lavado",
          },
        });
      } else {
        estadoPago = "BONIFICADO";
      }
    } else if (diferencia > 0.01 && data.tratamientoSobrante === "SALDO_A_FAVOR") {
      await tx.movimientoCuenta.create({
        data: {
          lavaderoId: user.lavaderoId,
          clienteId: lavado.clienteId,
          fecha: new Date(),
          tipo: "SALDO_A_FAVOR",
          importe: diferencia,
          lavadoId,
          observaciones: data.motivo || "Pagó de más en el lavado",
        },
      });
    }

    await tx.lavado.update({
      where: { id: lavadoId },
      data: {
        importeCobrado: data.importe,
        estadoPago,
        formaPago: data.formaPago,
        motivoAjuste: data.motivo || null,
        pagos:
          data.formaPago === "MIXTO"
            ? { create: data.pagos!.map((p) => ({ medio: p.medio, importe: p.importe })) }
            : undefined,
      },
    });
  });

  revalidatePath(`/admin/lavados/${lavadoId}`);
  revalidatePath("/admin/lavados");
  revalidatePath(`/admin/clientes/${lavado.clienteId}`);
  revalidatePath("/admin/caja");
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
