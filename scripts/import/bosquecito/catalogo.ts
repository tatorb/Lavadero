import type { TipoServicio, TipoVehiculo } from "@prisma/client";

/**
 * Catálogo de servicios de El Bosquecito (precios de referencia de julio 2026).
 * Los lavados históricos conservan el precio realmente cobrado en cada fecha.
 */

export interface ServicioCatalogo {
  nombre: string;
  tipo: TipoServicio;
  precio: number; // base (AUTO)
  duracionMin: number;
  puntos: number;
  descripcion?: string;
  precios?: Partial<Record<TipoVehiculo, number>>;
}

const PRECIOS_COMPLETO: Partial<Record<TipoVehiculo, number>> = {
  AUTO: 23000,
  SUV: 24500,
  UTILITARIO: 24500,
  PICKUP: 29000,
  PICKUP_GRANDE: 33000,
  UTILITARIO_GRANDE: 36000,
  MOTO: 10000,
};

export const CATALOGO: ServicioCatalogo[] = [
  {
    nombre: "Lavado normal",
    tipo: "PRINCIPAL",
    precio: 23000,
    duracionMin: 45,
    puntos: 10,
    descripcion: "Lavado exterior e interior estándar",
    precios: PRECIOS_COMPLETO,
  },
  {
    nombre: "Lavado completo",
    tipo: "PRINCIPAL",
    precio: 23000,
    duracionMin: 60,
    puntos: 15,
    descripcion: "Exterior, interior y llantas",
    precios: PRECIOS_COMPLETO,
  },
  {
    nombre: "Lavado express",
    tipo: "PRINCIPAL",
    precio: 16000,
    duracionMin: 25,
    puntos: 5,
    descripcion: "Lavado económico / Uber Express",
  },
  {
    nombre: "Lavado exterior",
    tipo: "PRINCIPAL",
    precio: 12000,
    duracionMin: 25,
    puntos: 5,
    descripcion: "Solo exterior",
  },
  {
    nombre: "Limpieza interior",
    tipo: "PRINCIPAL",
    precio: 8000,
    duracionMin: 30,
    puntos: 5,
    descripcion: "Solo interior y aspirado",
  },
  {
    nombre: "Lavado con cera",
    tipo: "PRINCIPAL",
    precio: 29000,
    duracionMin: 60,
    puntos: 15,
    descripcion: "Lavado completo + cera protectora",
    precios: {
      AUTO: 29000,
      SUV: 30500,
      UTILITARIO: 30500,
      PICKUP: 35000,
      PICKUP_GRANDE: 39000,
      UTILITARIO_GRANDE: 42000,
    },
  },
  {
    nombre: "Lavado brillo",
    tipo: "PRINCIPAL",
    precio: 27000,
    duracionMin: 60,
    puntos: 15,
    descripcion: "Lavado con terminación brillo",
  },
  {
    nombre: "Lavado profundo",
    tipo: "PRINCIPAL",
    precio: 32000,
    duracionMin: 90,
    puntos: 20,
    descripcion: "Limpieza profunda interior y exterior",
  },
  {
    nombre: "Lavado premium",
    tipo: "PRINCIPAL",
    precio: 45000,
    duracionMin: 120,
    puntos: 35,
    descripcion: "Detallado completo",
  },
  // Adicionales
  { nombre: "Cera", tipo: "ADDON", precio: 6000, duracionMin: 15, puntos: 5 },
  {
    nombre: "Lavado de chasis",
    tipo: "ADDON",
    precio: 20000,
    duracionMin: 30,
    puntos: 10,
    descripcion: "Chasis normal a presión",
  },
  {
    nombre: "Chasis en profundidad",
    tipo: "ADDON",
    precio: 30000,
    duracionMin: 45,
    puntos: 15,
  },
  {
    nombre: "Lavado de motor",
    tipo: "ADDON",
    precio: 20000,
    duracionMin: 30,
    puntos: 10,
  },
  {
    nombre: "Nutrición de plásticos interior",
    tipo: "ADDON",
    precio: 10000,
    duracionMin: 20,
    puntos: 5,
  },
  {
    nombre: "Nutrición exterior simple",
    tipo: "ADDON",
    precio: 6000,
    duracionMin: 15,
    puntos: 5,
  },
  {
    nombre: "Nutrición exterior completa",
    tipo: "ADDON",
    precio: 10000,
    duracionMin: 25,
    puntos: 5,
  },
  {
    nombre: "Tapizado interior completo",
    tipo: "ADDON",
    precio: 99000,
    duracionMin: 180,
    puntos: 40,
    descripcion: "Desde $99.000",
  },
  {
    nombre: "Tapizado parcial",
    tipo: "ADDON",
    precio: 35000,
    duracionMin: 90,
    puntos: 20,
    descripcion: "Por sectores: asientos, pisos, baúl o techo",
  },
  { nombre: "Vinilo", tipo: "ADDON", precio: 8000, duracionMin: 20, puntos: 5 },
  { nombre: "Rampa", tipo: "ADDON", precio: 10000, duracionMin: 15, puntos: 5 },
  { nombre: "Extra", tipo: "ADDON", precio: 6000, duracionMin: 15, puntos: 5 },
];

interface TokenServicio {
  nombre: string;
  esPrincipal: boolean;
}

/** Mapea un token del registro ("normal", "cera", "chasis"…) a un servicio del catálogo. */
export function mapearTokenServicio(token: string): TokenServicio | null {
  const t = token
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
  if (!t || t === "-") return null;
  if (/^normal/.test(t)) return { nombre: "Lavado normal", esPrincipal: true };
  if (/^completo/.test(t)) return { nombre: "Lavado completo", esPrincipal: true };
  if (/expres|econom|descuento uber/.test(t))
    return { nombre: "Lavado express", esPrincipal: true };
  if (/^exterior/.test(t)) return { nombre: "Lavado exterior", esPrincipal: true };
  if (/^interior/.test(t)) return { nombre: "Limpieza interior", esPrincipal: true };
  if (/^cera/.test(t)) return { nombre: "Cera", esPrincipal: false };
  if (/^brillo/.test(t)) return { nombre: "Lavado brillo", esPrincipal: true };
  if (/^profundo/.test(t)) return { nombre: "Lavado profundo", esPrincipal: true };
  if (/^premium/.test(t)) return { nombre: "Lavado premium", esPrincipal: true };
  if (/chasis en profundidad|chaisis en profundidad/.test(t))
    return { nombre: "Chasis en profundidad", esPrincipal: false };
  if (/chasis|chaisis/.test(t)) return { nombre: "Lavado de chasis", esPrincipal: false };
  if (/motor/.test(t)) return { nombre: "Lavado de motor", esPrincipal: false };
  if (/tapizado promo|tapizado interior|tapizados? completo|^tapizado$|^tapizados$/.test(t))
    return { nombre: "Tapizado interior completo", esPrincipal: false };
  if (/tapizado/.test(t)) return { nombre: "Tapizado parcial", esPrincipal: false };
  if (/nutricion|nutriciones|acondicionamiento/.test(t))
    return { nombre: "Nutrición de plásticos interior", esPrincipal: false };
  if (/vinilo/.test(t)) return { nombre: "Vinilo", esPrincipal: false };
  if (/rampa/.test(t)) return { nombre: "Rampa", esPrincipal: false };
  if (/extra/.test(t)) return { nombre: "Extra", esPrincipal: false };
  return null;
}

export interface ServicioParseado {
  principal: string; // nombre en el catálogo
  addons: string[];
  reconocido: boolean;
}

/**
 * Parsea el texto de servicio del registro conservando los combinados reales:
 * "Normal + Chasis" → principal "Lavado normal" + addon "Lavado de chasis".
 * "Cera" solo → "Lavado con cera". "Chasis" solo → express + addon chasis? No:
 * el addon pasa a ser el servicio principal del lavado (venta suelta).
 */
export function parsearServicio(texto: string): ServicioParseado {
  const tokens = texto
    .split(/[+\-–]|\by\b/i)
    .map((t) => t.trim())
    .filter(Boolean);

  // Caso especial: "Normal Cera" sin separador
  if (tokens.length === 1 && /normal\s+cera/i.test(tokens[0])) {
    return { principal: "Lavado normal", addons: ["Cera"], reconocido: true };
  }

  const mapeados = tokens.map(mapearTokenServicio);
  const reconocido = mapeados.every((m) => m !== null) && mapeados.length > 0;

  let principal: string | null = null;
  const addons: string[] = [];
  for (const m of mapeados) {
    if (!m) continue;
    if (m.esPrincipal && !principal) {
      principal = m.nombre;
    } else if (m.nombre === "Cera" && !principal && mapeados.length === 1) {
      // "Cera" como servicio entero = lavado con cera
      principal = "Lavado con cera";
    } else {
      addons.push(m.nombre);
    }
  }
  // Solo addons (ej. "Chasis" suelto): el primero actúa como principal
  if (!principal && addons.length > 0) {
    principal = addons.shift()!;
  }
  if (!principal) {
    return { principal: "Lavado normal", addons: [], reconocido: false };
  }
  return { principal, addons, reconocido };
}
