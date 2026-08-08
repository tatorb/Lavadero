import { Droplets } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Logo del lavadero con fallback al ícono genérico cuando todavía no cargaron
 * uno. Usa <img> plano a propósito: el logo suele venir como data URI.
 */
export function LogoLavadero({
  logoUrl,
  nombre,
  className,
  size = 36,
}: {
  logoUrl: string | null;
  nombre: string;
  className?: string;
  size?: number;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={nombre}
        width={size}
        height={size}
        className={cn("shrink-0 rounded-lg object-contain", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground",
        className
      )}
      style={{ width: size, height: size }}
    >
      <Droplets style={{ width: size * 0.55, height: size * 0.55 }} />
    </div>
  );
}
