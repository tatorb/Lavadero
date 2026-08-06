"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Barra de progreso global de navegación. Detecta el inicio de cualquier
 * navegación (Link o router.push actualizan la URL de inmediato vía
 * pushState) y se oculta cuando la nueva pantalla terminó de montarse.
 */
export function NavegacionProgreso() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = React.useState(false);

  // La navegación terminó: cambió la URL renderizada (con un mínimo visible
  // para que el gesto se perciba incluso en navegaciones instantáneas)
  React.useEffect(() => {
    const t = setTimeout(() => setVisible(false), 150);
    return () => clearTimeout(t);
  }, [pathname, searchParams]);

  React.useEffect(() => {
    const original = history.pushState.bind(history);
    history.pushState = (...args: Parameters<History["pushState"]>) => {
      setVisible(true);
      return original(...args);
    };
    const onPop = () => setVisible(true);
    window.addEventListener("popstate", onPop);
    return () => {
      history.pushState = original;
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  // Red de seguridad: nunca dejarla colgada
  React.useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(t);
  }, [visible]);

  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-primary/15">
      <div className="animate-barra h-full w-1/4 rounded-full bg-primary" />
    </div>
  );
}
