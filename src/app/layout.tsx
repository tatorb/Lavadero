import type { Metadata } from "next";
import { Suspense } from "react";

import { CLASES_FUENTES } from "@/lib/fuentes";
import { NavegacionProgreso } from "@/components/navegacion-progreso";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lavadero",
  description: "Gestión de lavaderos de autos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${CLASES_FUENTES} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <NavegacionProgreso />
        </Suspense>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
