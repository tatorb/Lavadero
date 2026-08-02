import type { NextAuthConfig } from "next-auth";

/**
 * Config edge-safe (sin Prisma) compartida entre el proxy/middleware y el
 * runtime de Node. Los providers reales se agregan en lib/auth.ts.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.tipo = user.tipo;
        token.rol = user.rol;
        token.lavaderoId = user.lavaderoId;
        token.nombre = user.nombre;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.tipo = token.tipo as "staff" | "cliente";
      session.user.rol = token.rol as "SUPER_ADMIN" | "ADMIN" | "OPERATIVO" | undefined;
      session.user.lavaderoId = token.lavaderoId as string | null;
      session.user.nombre = token.nombre as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
