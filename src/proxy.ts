import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

// Rutas del cliente que requieren sesión (el resto de "/" es público: login/registro)
const RUTAS_CLIENTE = ["/", "/historial", "/turnos", "/perfil"];

export default auth((req) => {
  const { nextUrl } = req;
  const user = req.auth?.user;
  const path = nextUrl.pathname;

  const esStaff = user?.tipo === "staff";
  const esCliente = user?.tipo === "cliente";

  const loginUrl = () => {
    const url = new URL("/login", nextUrl);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  };

  if (path.startsWith("/super")) {
    if (!user) return loginUrl();
    if (!esStaff || user.rol !== "SUPER_ADMIN")
      return NextResponse.redirect(new URL(esStaff ? "/admin" : "/", nextUrl));
    return NextResponse.next();
  }

  if (path.startsWith("/admin")) {
    if (!user) return loginUrl();
    if (!esStaff) return NextResponse.redirect(new URL("/", nextUrl));
    if (user.rol === "SUPER_ADMIN")
      return NextResponse.redirect(new URL("/super", nextUrl));
    return NextResponse.next();
  }

  // Links de marca por lavadero (/l/[slug]): públicos, pero si ya hay sesión
  // no tiene sentido mostrar el login
  if (path === "/login" || path === "/registro" || path.startsWith("/l/")) {
    if (esStaff)
      return NextResponse.redirect(
        new URL(user.rol === "SUPER_ADMIN" ? "/super" : "/admin", nextUrl)
      );
    if (esCliente) return NextResponse.redirect(new URL("/", nextUrl));
    return NextResponse.next();
  }

  if (RUTAS_CLIENTE.some((r) => path === r || (r !== "/" && path.startsWith(`${r}/`)))) {
    if (!user) return loginUrl();
    if (esStaff)
      return NextResponse.redirect(
        new URL(user.rol === "SUPER_ADMIN" ? "/super" : "/admin", nextUrl)
      );
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)).*)"],
};
