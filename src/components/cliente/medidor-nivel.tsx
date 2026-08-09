import { cn } from "@/lib/utils";

const TICKS = 44;
const ANGULO_INICIO = 135; // abajo-izquierda
const BARRIDO = 270; // deja un hueco abajo, como un termostato

const TAMANO = 220;
const CENTRO = TAMANO / 2;
const RADIO_EXT = 96;
const LARGO_TICK = 13;

/**
 * Medidor circular de progreso: arco de marcas alrededor del dato principal.
 * Las marcas cumplidas toman el color de marca; las restantes quedan tenues.
 * Es sólo visualización (no es un control), así que se renderiza en el servidor.
 */
export function MedidorNivel({
  puntos,
  progreso,
  className,
}: {
  puntos: number;
  /** 0 a 1 */
  progreso: number;
  className?: string;
}) {
  const cumplidos = Math.round(Math.min(Math.max(progreso, 0), 1) * TICKS);

  const marcas = Array.from({ length: TICKS }, (_, i) => {
    const angulo = ANGULO_INICIO + (i / (TICKS - 1)) * BARRIDO;
    const rad = (angulo * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sen = Math.sin(rad);
    const activo = i < cumplidos;
    // La marca que marca la posición actual se dibuja más larga
    const esPunta = i === cumplidos - 1;
    const largo = esPunta ? LARGO_TICK + 5 : LARGO_TICK;
    return {
      i,
      activo,
      esPunta,
      x1: CENTRO + (RADIO_EXT - largo) * cos,
      y1: CENTRO + (RADIO_EXT - largo) * sen,
      x2: CENTRO + RADIO_EXT * cos,
      y2: CENTRO + RADIO_EXT * sen,
    };
  });

  return (
    <div className={cn("relative mx-auto w-[220px]", className)}>
      {/* Halo difuso detrás del arco cumplido */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-6 rounded-full opacity-40 blur-2xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--primary) 45%, transparent), transparent 70%)",
        }}
      />
      <svg
        viewBox={`0 0 ${TAMANO} ${TAMANO}`}
        className="relative w-full"
        role="img"
        aria-label={`${puntos} puntos, ${Math.round(progreso * 100)}% hacia el próximo nivel`}
      >
        {marcas.map((m) => (
          <line
            key={m.i}
            x1={m.x1}
            y1={m.y1}
            x2={m.x2}
            y2={m.y2}
            strokeWidth={m.esPunta ? 4 : 2.5}
            strokeLinecap="round"
            stroke={m.activo ? "var(--primary)" : "var(--border)"}
            opacity={m.activo ? 1 : 0.9}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="dato-xl">{puntos}</span>
        <span className="etiqueta mt-1">Puntos</span>
      </div>
    </div>
  );
}
