"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export type EstadoAccion = { error?: string; ok?: boolean; id?: string } | undefined;

const clienteSchema = z.object({
  nombre: z.string().min(2, "Nombre demasiado corto"),
  apellido: z.string().optional(),
  telefono: z.string().optional(),
  email: z
    .string()
    .email("Email inválido")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  tipoRelacion: z.enum(["CLIENTE", "AMIGO", "FAMILIAR", "DESCONOCIDO"]).optional(),
  origen: z.string().optional(),
  detalles: z.string().optional(),
});

export async function crearCliente(
  _prev: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  const user = await requireStaff();
  const parsed = clienteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const email = parsed.data.email?.toLowerCase().trim();

  if (email) {
    const existente = await prisma.cliente.findUnique({
      where: { lavaderoId_email: { lavaderoId: user.lavaderoId, email } },
    });
    if (existente) return { error: "Ya existe un cliente con ese email" };
  }

  const cliente = await prisma.cliente.create({
    data: { ...parsed.data, email, lavaderoId: user.lavaderoId },
  });
  revalidatePath("/admin/clientes");
  return { ok: true, id: cliente.id };
}

export async function editarCliente(
  id: string,
  _prev: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  const user = await requireStaff();
  const parsed = clienteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const email = parsed.data.email?.toLowerCase().trim();

  const { count } = await prisma.cliente.updateMany({
    where: { id, lavaderoId: user.lavaderoId },
    data: { ...parsed.data, email: email ?? null },
  });
  if (count === 0) return { error: "Cliente no encontrado" };
  revalidatePath(`/admin/clientes/${id}`);
  revalidatePath("/admin/clientes");
  return { ok: true };
}

/** Vincula dos clientes (pareja/familiar) de forma simétrica. */
export async function vincularClientes(clienteId: string, otroId: string): Promise<EstadoAccion> {
  const user = await requireStaff();
  if (clienteId === otroId) return { error: "No se puede vincular un cliente consigo mismo" };

  const [a, b] = await Promise.all([
    prisma.cliente.findFirst({ where: { id: clienteId, lavaderoId: user.lavaderoId } }),
    prisma.cliente.findFirst({ where: { id: otroId, lavaderoId: user.lavaderoId } }),
  ]);
  if (!a || !b) return { error: "Cliente no encontrado" };
  if (a.vinculadoConId || b.vinculadoConId)
    return { error: "Alguno de los dos ya está vinculado a otro cliente" };

  await prisma.$transaction([
    prisma.cliente.update({ where: { id: a.id }, data: { vinculadoConId: b.id } }),
    prisma.cliente.update({ where: { id: b.id }, data: { vinculadoConId: a.id } }),
  ]);
  revalidatePath(`/admin/clientes/${clienteId}`);
  revalidatePath(`/admin/clientes/${otroId}`);
  return { ok: true };
}

export async function desvincularCliente(clienteId: string): Promise<EstadoAccion> {
  const user = await requireStaff();
  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, lavaderoId: user.lavaderoId },
  });
  if (!cliente?.vinculadoConId) return { error: "El cliente no está vinculado" };

  await prisma.$transaction([
    prisma.cliente.update({ where: { id: cliente.id }, data: { vinculadoConId: null } }),
    prisma.cliente.update({
      where: { id: cliente.vinculadoConId },
      data: { vinculadoConId: null },
    }),
  ]);
  revalidatePath(`/admin/clientes/${clienteId}`);
  return { ok: true };
}

// ===== Autos =====

const autoSchema = z.object({
  marca: z.string().min(2, "Ingresá la marca"),
  modelo: z.string().min(1, "Ingresá el modelo"),
  patente: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.toUpperCase().replace(/\s/g, "") : null)),
  tipo: z.enum([
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
  ]),
  color: z.string().optional(),
  detalles: z.string().optional(),
});

async function patenteDuplicada(lavaderoId: string, patente: string, exceptoId?: string) {
  const existente = await prisma.auto.findUnique({
    where: { lavaderoId_patente: { lavaderoId, patente } },
  });
  return existente !== null && existente.id !== exceptoId;
}

export async function crearAuto(
  clienteId: string,
  _prev: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  const user = await requireStaff();
  const parsed = autoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { patente, ...datos } = parsed.data;

  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, lavaderoId: user.lavaderoId },
  });
  if (!cliente) return { error: "Cliente no encontrado" };

  if (patente && (await patenteDuplicada(user.lavaderoId, patente))) {
    return { error: "Ya existe un auto con esa patente" };
  }

  await prisma.auto.create({
    data: { ...datos, patente, clienteId, lavaderoId: user.lavaderoId },
  });
  revalidatePath(`/admin/clientes/${clienteId}`);
  return { ok: true };
}

export async function editarAuto(
  autoId: string,
  _prev: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  const user = await requireStaff();
  const parsed = autoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { patente, ...datos } = parsed.data;

  const auto = await prisma.auto.findFirst({
    where: { id: autoId, lavaderoId: user.lavaderoId },
  });
  if (!auto) return { error: "Auto no encontrado" };

  if (patente && (await patenteDuplicada(user.lavaderoId, patente, autoId))) {
    return { error: "Ya existe otro auto con esa patente" };
  }

  await prisma.auto.update({
    where: { id: autoId },
    data: { ...datos, patente },
  });
  revalidatePath(`/admin/clientes/${auto.clienteId}`);
  return { ok: true };
}
