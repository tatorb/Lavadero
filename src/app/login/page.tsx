import Link from "next/link";
import { Droplets } from "lucide-react";

import { LoginForm } from "./login-form";

export const metadata = { title: "Ingresar — Lavadero" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Droplets className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Lavadero</h1>
          <p className="text-sm text-muted-foreground">
            Ingresá con tu email y contraseña
          </p>
        </div>
        <LoginForm />
        <p className="text-center text-sm text-muted-foreground">
          ¿Sos cliente y no tenés cuenta?{" "}
          <Link href="/registro" className="font-medium text-primary hover:underline">
            Registrate
          </Link>
        </p>
      </div>
    </main>
  );
}
