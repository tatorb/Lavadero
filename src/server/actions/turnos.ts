"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { requireCliente, requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { validarTurno, type MotivoRechazo } from "@/lib/turnos/reglas";

export type EstadoAccion = { error?: string; ok?: boolean; id?: string } | undefined;

const MENSAJES_RECHAZO: Record<MotivoRechazo, string> = {
  sin_regla: "El lavadero no atiende en ese horario",
  desalineado: "El horario elegido no coincide con la grilla de turnos",
  pasado: "Ese horario ya pasó",
  anticipacion_min: "Ese horario requiere reservar con más anticipación",
  anticipacion_max: "Todavía no se puede reservar para esa fecha",
  lleno: "Ese horario ya está completo",
};

function revalidarTurnos() {
  revalidatePath("/admin/turnos");
  revalidatePath("/turnos");
}

// ===== Cliente =====

const crearTurnoClienteSchema = z.object({
  autoId: z.string().min(1, "Elegí un auto"),
  servicioId: z.string().min(1, "Elegí un servicio"),
  addonIds: z.array(z.string()).optional(),
  fechaISO: z.string().datetime({ offset: true }).or(z.string().datetime()),
  detalle: z.string().optional(),
});

/**
 * Pedido de turno desde la app del cliente. Valida las reglas de franja y
 * re-chequea la capacidad dentro de una transacción serializable para evitar
 * que dos clientes tomen el último cupo a la vez.
 */
export async function crearTurnoCliente(
  input: z.infer<typeof crearTurnoClienteSchema>
): Promise<EstadoAccion> {
  const user = await requireCliente();
  const parsed = crearTurnoClienteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;
  const fechaTurno = new Date(data.fechaISO);

  const [lavadero, cliente, servicio] = await Promise.all([
    prisma.lavadero.findUniqueOrThrow({
      where: { id: user.lavaderoId },
      select: { timezone: true },
    }),
    prisma.cliente.findUniqueOrThrow({
      where: { id: user.id },
      include: { vinculadoCon: { select: { id: true } } },
    }),
    prisma.servicio.findFirst({
      where: {
        id: data.servicioId,
        lavaderoId: user.lavaderoId,
        tipo: "PRINCIPAL",
        activo: true,
      },
    }),
  ]);
  if (!servicio) return { error: "Servicio no encontrado" };

  const auto = await prisma.auto.findFirst({
    where: {
      id: data.autoId,
      lavaderoId: user.lavaderoId,
      clienteId: { in: [cliente.id, cliente.vinculadoCon?.id ?? ""].filter(Boolean) },
      activo: true,
    },
  });
  if (!auto) return { error: "El auto no es válido" };

  const addons = data.addonIds?.length
    ? await prisma.servicio.findMany({
        where: {
          id: { in: data.addonIds },
          lavaderoId: user.lavaderoId,
          tipo: "ADDON",
          activo: true,
        },
      })
    : [];

  const reglas = await prisma.reglaFranja.findMany({
    where: { lavaderoId: user.lavaderoId, activo: true },
  });

  const MAX_REINTENTOS = 3;
  for (let intento = 1; intento <= MAX_REINTENTOS; intento++) {
    try {
      const turno = await prisma.$transaction(
        async (tx) => {
          const ocupados = await tx.turno.count({
            where: {
              lavaderoId: user.lavaderoId,
              fechaTurno,
              estado: { in: ["PENDIENTE", "CONFIRMADO"] },
            },
          });

          const validacion = validarTurno(
            reglas,
            fechaTurno,
            new Date(),
            lavadero.timezone,
            ocupados
          );
          if (!validacion.valido) {
            throw new Error(MENSAJES_RECHAZO[validacion.motivo!]);
          }

          return tx.turno.create({
            data: {
              lavaderoId: user.lavaderoId,
              clienteId: cliente.id,
              autoId: auto.id,
              servicioId: servicio.id,
              fechaTurno,
              duracionMin: servicio.duracionMin,
              estado: validacion.regla!.confirmacionAuto ? "CONFIRMADO" : "PENDIENTE",
              origen: "CLIENTE",
              detalle: data.detalle,
              addons: { create: addons.map((a) => ({ servicioId: a.id })) },
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

      revalidarTurnos();
      return { ok: true, id: turno.id };
    } catch (e) {
      // P2034: conflicto de serialización → reintentar
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2034" &&
        intento < MAX_REINTENTOS
      ) {
        continue;
      }
      if (e instanceof Error && !(e instanceof Prisma.PrismaClientKnownRequestError)) {
        return { error: e.message };
      }
      return { error: "No se pudo crear el turno, probá de nuevo" };
    }
  }
  return { error: "No se pudo crear el turno, probá de nuevo" };
}

export async function cancelarTurnoCliente(id: string): Promise<EstadoAccion> {
  const user = await requireCliente();
  const { count } = await prisma.turno.updateMany({
    where: {
      id,
      clienteId: user.id,
      estado: { in: ["PENDIENTE", "CONFIRMADO"] },
      fechaTurno: { gt: new Date() },
    },
    data: { estado: "CANCELADO", canceladoMotivo: "Cancelado por el cliente" },
  });
  if (count === 0) return { error: "El turno no se puede cancelar" };
  revalidarTurnos();
  return { ok: true };
}

// ===== Staff =====

const crearTurnoAdminSchema = z.object({
  clienteId: z.string().min(1, "Elegí un cliente"),
  autoId: z.string().optional(),
  servicioId: z.string().min(1, "Elegí un servicio"),
  fechaISO: z.string().min(1, "Elegí fecha y hora"),
  detalle: z.string().optional(),
});

/** Alta de turno desde el panel (override: no valida reglas de franja). */
export async function crearTurnoAdmin(
  input: z.infer<typeof crearTurnoAdminSchema>
): Promise<EstadoAccion> {
  const user = await requireStaff();
  const parsed = crearTurnoAdminSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;
  const fechaTurno = new Date(data.fechaISO);
  if (Number.isNaN(fechaTurno.getTime())) return { error: "Fecha inválida" };

  const [cliente, servicio] = await Promise.all([
    prisma.cliente.findFirst({
      where: { id: data.clienteId, lavaderoId: user.lavaderoId },
      include: { vinculadoCon: { select: { id: true } } },
    }),
    prisma.servicio.findFirst({
      where: { id: data.servicioId, lavaderoId: user.lavaderoId, tipo: "PRINCIPAL" },
    }),
  ]);
  if (!cliente) return { error: "Cliente no encontrado" };
  if (!servicio) return { error: "Servicio no encontrado" };

  if (data.autoId) {
    const auto = await prisma.auto.findFirst({
      where: {
        id: data.autoId,
        lavaderoId: user.lavaderoId,
        clienteId: {
          in: [cliente.id, cliente.vinculadoCon?.id ?? ""].filter(Boolean),
        },
      },
    });
    if (!auto) return { error: "El auto no pertenece al cliente" };
  }

  const turno = await prisma.turno.create({
    data: {
      lavaderoId: user.lavaderoId,
      clienteId: cliente.id,
      autoId: data.autoId || null,
      servicioId: servicio.id,
      fechaTurno,
      duracionMin: servicio.duracionMin,
      estado: "CONFIRMADO",
      origen: "ADMIN",
      detalle: data.detalle,
    },
  });
  revalidarTurnos();
  return { ok: true, id: turno.id };
}

export async function confirmarTurno(id: string): Promise<EstadoAccion> {
  const user = await requireStaff();
  const { count } = await prisma.turno.updateMany({
    where: { id, lavaderoId: user.lavaderoId, estado: "PENDIENTE" },
    data: { estado: "CONFIRMADO" },
  });
  if (count === 0) return { error: "El turno no está pendiente" };
  revalidarTurnos();
  return { ok: true };
}

export async function cancelarTurno(id: string, motivo?: string): Promise<EstadoAccion> {
  const user = await requireStaff();
  const { count } = await prisma.turno.updateMany({
    where: {
      id,
      lavaderoId: user.lavaderoId,
      estado: { in: ["PENDIENTE", "CONFIRMADO"] },
    },
    data: { estado: "CANCELADO", canceladoMotivo: motivo || "Cancelado por el lavadero" },
  });
  if (count === 0) return { error: "El turno no se puede cancelar" };
  revalidarTurnos();
  return { ok: true };
}

export async function reprogramarTurno(id: string, fechaISO: string): Promise<EstadoAccion> {
  const user = await requireStaff();
  const fechaTurno = new Date(fechaISO);
  if (Number.isNaN(fechaTurno.getTime())) return { error: "Fecha inválida" };

  const { count } = await prisma.turno.updateMany({
    where: {
      id,
      lavaderoId: user.lavaderoId,
      estado: { in: ["PENDIENTE", "CONFIRMADO"] },
    },
    data: { fechaTurno, estado: "CONFIRMADO" },
  });
  if (count === 0) return { error: "El turno no se puede reprogramar" };
  revalidarTurnos();
  return { ok: true };
}
