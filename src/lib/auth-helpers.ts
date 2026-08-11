import "server-only";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import type { Rol } from "@/types/next-auth";

/**
 * Exige una sesión de staff con lavadero asignado (ADMIN u OPERATIVO).
 * Devuelve el usuario de sesión con su lavaderoId — la única fuente válida
 * de tenant: nunca aceptar lavaderoId desde el input del cliente.
 */
export async function requireStaff(roles: Rol[] = ["ADMIN", "OPERATIVO"]) {
  const session = await auth();
  const user = session?.user;
  if (!user || user.tipo !== "staff" || !user.rol || !roles.includes(user.rol)) {
    redirect("/login");
  }
  if (user.rol !== "SUPER_ADMIN" && !user.lavaderoId) {
    redirect("/login");
  }
  return user as typeof user & { lavaderoId: string };
}

/**
 * Igual que `requireStaff` pero sin redirigir: devuelve el error para que la
 * server action lo muestre.
 *
 * En una server action, `redirect("/login")` manda al login a alguien que tiene
 * la sesión perfectamente válida y solo le falta el rol — parece que se le
 * venció la sesión y pierde lo que estaba haciendo. Para las acciones sensibles
 * conviene decirle que no tiene permiso y dejarlo donde está.
 */
export async function permisoStaff(roles: Rol[]) {
  const session = await auth();
  const user = session?.user;
  if (!user || user.tipo !== "staff" || !user.rol) {
    return { error: "Necesitás iniciar sesión" as const };
  }
  if (!roles.includes(user.rol) || !user.lavaderoId) {
    return {
      error: "Solo el dueño del lavadero puede hacer esto" as const,
    };
  }
  return { user: user as typeof user & { lavaderoId: string } };
}

export async function requireSuperAdmin() {
  const session = await auth();
  const user = session?.user;
  if (!user || user.tipo !== "staff" || user.rol !== "SUPER_ADMIN") {
    redirect("/login");
  }
  return user;
}

export async function requireCliente() {
  const session = await auth();
  const user = session?.user;
  if (!user || user.tipo !== "cliente" || !user.lavaderoId) {
    redirect("/login");
  }
  return user as typeof user & { lavaderoId: string };
}
