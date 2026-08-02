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
