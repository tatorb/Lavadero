import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";

const credencialesSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const parsed = credencialesSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const emailNorm = email.toLowerCase().trim();

        // Primero staff, después cliente con cuenta activada
        const usuario = await prisma.usuario.findUnique({ where: { email: emailNorm } });
        if (usuario && usuario.activo) {
          const ok = await bcrypt.compare(password, usuario.passwordHash);
          if (ok) {
            return {
              id: usuario.id,
              email: usuario.email,
              nombre: usuario.nombre,
              tipo: "staff" as const,
              rol: usuario.rol,
              lavaderoId: usuario.lavaderoId,
            };
          }
          return null;
        }

        const cliente = await prisma.cliente.findFirst({
          where: { email: emailNorm, passwordHash: { not: null }, activo: true },
        });
        if (cliente?.passwordHash) {
          const ok = await bcrypt.compare(password, cliente.passwordHash);
          if (ok) {
            return {
              id: cliente.id,
              email: cliente.email,
              nombre: cliente.nombre,
              tipo: "cliente" as const,
              lavaderoId: cliente.lavaderoId,
            };
          }
        }
        return null;
      },
    }),
  ],
});
