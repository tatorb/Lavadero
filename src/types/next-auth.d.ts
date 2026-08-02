import type { DefaultSession } from "next-auth";

export type TipoUsuario = "staff" | "cliente";
export type Rol = "SUPER_ADMIN" | "ADMIN" | "OPERATIVO";

declare module "next-auth" {
  interface User {
    tipo: TipoUsuario;
    rol?: Rol;
    lavaderoId: string | null;
    nombre: string;
  }

  interface Session {
    user: {
      id: string;
      tipo: TipoUsuario;
      rol?: Rol;
      lavaderoId: string | null;
      nombre: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    tipo?: TipoUsuario;
    rol?: Rol;
    lavaderoId?: string | null;
    nombre?: string;
  }
}
