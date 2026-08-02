"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { requireSuperAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { NIVELES_DEFAULT } from "@/lib/gamificacion/niveles";

export type EstadoAccion = { error?: string; ok?: boolean } | undefined;

const lavaderoSchema = z.object({
  nombre: z.string().min(2, "Nombre demasiado corto"),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "El identificador solo admite minúsculas, números y guiones"),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
});

export async function crearLavadero(
  _prev: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  await requireSuperAdmin();
  const parsed = lavaderoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existente = await prisma.lavadero.findUnique({
    where: { slug: parsed.data.slug },
  });
  if (existente) return { error: "Ya existe un lavadero con ese identificador" };

  // Todo lavadero nace con los niveles de gamificación default
  await prisma.lavadero.create({
    data: {
      ...parsed.data,
      niveles: { create: NIVELES_DEFAULT },
    },
  });
  revalidatePath("/super/lavaderos");
  return { ok: true };
}

export async function editarLavadero(
  id: string,
  _prev: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  await requireSuperAdmin();
  const parsed = lavaderoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const duplicado = await prisma.lavadero.findUnique({
    where: { slug: parsed.data.slug },
  });
  if (duplicado && duplicado.id !== id)
    return { error: "Ya existe un lavadero con ese identificador" };

  await prisma.lavadero.update({ where: { id }, data: parsed.data });
  revalidatePath("/super/lavaderos");
  return { ok: true };
}

export async function toggleLavadero(id: string): Promise<EstadoAccion> {
  await requireSuperAdmin();
  const lavadero = await prisma.lavadero.findUnique({ where: { id } });
  if (!lavadero) return { error: "Lavadero no encontrado" };
  await prisma.lavadero.update({
    where: { id },
    data: { activo: !lavadero.activo },
  });
  revalidatePath("/super/lavaderos");
  return { ok: true };
}

// ===== Usuarios staff =====

const usuarioSchema = z.object({
  nombre: z.string().min(2, "Nombre demasiado corto"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  rol: z.enum(["SUPER_ADMIN", "ADMIN", "OPERATIVO"]),
  lavaderoId: z.string().optional(),
});

export async function crearUsuario(
  _prev: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  await requireSuperAdmin();
  const parsed = usuarioSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;
  const email = data.email.toLowerCase().trim();

  if (data.rol !== "SUPER_ADMIN" && !data.lavaderoId) {
    return { error: "Elegí el lavadero para este usuario" };
  }

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) return { error: "Ya existe un usuario con ese email" };

  await prisma.usuario.create({
    data: {
      nombre: data.nombre,
      email,
      passwordHash: await bcrypt.hash(data.password, 10),
      rol: data.rol,
      lavaderoId: data.rol === "SUPER_ADMIN" ? null : data.lavaderoId,
    },
  });
  revalidatePath("/super/usuarios");
  return { ok: true };
}

export async function toggleUsuario(id: string): Promise<EstadoAccion> {
  const actual = await requireSuperAdmin();
  if (actual.id === id) return { error: "No podés desactivar tu propio usuario" };
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) return { error: "Usuario no encontrado" };
  await prisma.usuario.update({
    where: { id },
    data: { activo: !usuario.activo },
  });
  revalidatePath("/super/usuarios");
  return { ok: true };
}
