"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { auth, signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type EstadoForm = { error?: string } | undefined;

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

export async function login(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const email = parsed.data.email.toLowerCase().trim();

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Email o contraseña incorrectos" };
    throw e;
  }

  // Destino según tipo/rol (la sesión recién se creó; resolvemos por email)
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (usuario) {
    redirect(usuario.rol === "SUPER_ADMIN" ? "/super" : "/admin");
  }
  redirect("/");
}

const registroSchema = z.object({
  nombre: z.string().min(2, "Ingresá tu nombre"),
  apellido: z.string().optional(),
  telefono: z.string().min(6, "Ingresá tu teléfono"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  lavaderoId: z.string().min(1, "Elegí un lavadero"),
});

export async function registrarCliente(
  _prev: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const parsed = registroSchema.safeParse({
    nombre: formData.get("nombre"),
    apellido: formData.get("apellido") || undefined,
    telefono: formData.get("telefono"),
    email: formData.get("email"),
    password: formData.get("password"),
    lavaderoId: formData.get("lavaderoId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const data = parsed.data;
  const email = data.email.toLowerCase().trim();

  const lavadero = await prisma.lavadero.findFirst({
    where: { id: data.lavaderoId, activo: true },
  });
  if (!lavadero) return { error: "El lavadero elegido no existe" };

  const passwordHash = await bcrypt.hash(data.password, 10);

  const existente = await prisma.cliente.findUnique({
    where: { lavaderoId_email: { lavaderoId: lavadero.id, email } },
  });

  if (existente) {
    if (existente.passwordHash) {
      return { error: "Ya existe una cuenta con ese email. Iniciá sesión." };
    }
    // El admin ya lo cargó: reclama la ficha existente
    await prisma.cliente.update({
      where: { id: existente.id },
      data: { passwordHash, telefono: existente.telefono ?? data.telefono },
    });
  } else {
    await prisma.cliente.create({
      data: {
        lavaderoId: lavadero.id,
        nombre: data.nombre,
        apellido: data.apellido,
        telefono: data.telefono,
        email,
        passwordHash,
      },
    });
  }

  await signIn("credentials", { email, password: data.password, redirect: false });
  redirect("/");
}

export async function cerrarSesion() {
  const session = await auth();
  await signOut({ redirect: false });
  redirect(session?.user?.tipo === "staff" ? "/login" : "/login");
}
