/**
 * Identidad de marca por lavadero: catálogo de tipografías, validación de
 * colores y cálculo de contraste. Sin dependencias de servidor para poder
 * usarse también en los componentes de preview del cliente.
 */

export interface FuenteCatalogo {
  key: string;
  nombre: string;
  descripcion: string;
  /** Variable CSS que declara next/font en el layout raíz */
  variable: string;
  /** Recomendada para títulos (display) más que para textos largos */
  soloTitulos?: boolean;
}

export const FUENTES: FuenteCatalogo[] = [
  {
    key: "inter",
    nombre: "Inter",
    descripcion: "Neutra y moderna",
    variable: "--font-inter",
  },
  {
    key: "poppins",
    nombre: "Poppins",
    descripcion: "Geométrica y amigable",
    variable: "--font-poppins",
  },
  {
    key: "montserrat",
    nombre: "Montserrat",
    descripcion: "Comercial y sólida",
    variable: "--font-montserrat",
  },
  {
    key: "outfit",
    nombre: "Outfit",
    descripcion: "Minimalista y actual",
    variable: "--font-outfit",
  },
  {
    key: "nunito",
    nombre: "Nunito",
    descripcion: "Redondeada y cálida",
    variable: "--font-nunito",
  },
  {
    key: "rubik",
    nombre: "Rubik",
    descripcion: "Robusta y legible",
    variable: "--font-rubik",
  },
  {
    key: "manrope",
    nombre: "Manrope",
    descripcion: "Elegante y técnica",
    variable: "--font-manrope",
  },
  {
    key: "oswald",
    nombre: "Oswald",
    descripcion: "Condensada, tipo taller",
    variable: "--font-oswald",
    soloTitulos: true,
  },
  {
    key: "bebas",
    nombre: "Bebas Neue",
    descripcion: "Impacto para títulos",
    variable: "--font-bebas",
    soloTitulos: true,
  },
  {
    key: "playfair",
    nombre: "Playfair Display",
    descripcion: "Serif premium / detailing",
    variable: "--font-playfair",
    soloTitulos: true,
  },
];

export const FUENTE_DEFAULT = "inter";

export function buscarFuente(key: string | null | undefined): FuenteCatalogo {
  return FUENTES.find((f) => f.key === key) ?? FUENTES[0];
}

/** Paleta sugerida para el selector rápido de color. */
export const COLORES_SUGERIDOS = [
  "#2563EB", // azul
  "#0EA5E9", // celeste
  "#0D9488", // verde agua
  "#16A34A", // verde
  "#CA8A04", // dorado
  "#EA580C", // naranja
  "#DC2626", // rojo
  "#DB2777", // fucsia
  "#7C3AED", // violeta
  "#1F2937", // grafito
];

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Valida y normaliza un color de marca. Devuelve null si no es un hex válido. */
export function normalizarHex(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const v = valor.trim();
  return HEX.test(v) ? v.toLowerCase() : null;
}

function canalLineal(c: number) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** Luminancia relativa (WCAG) de un color hex. */
export function luminancia(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * canalLineal(r) + 0.7152 * canalLineal(g) + 0.0722 * canalLineal(b);
}

/** Relación de contraste WCAG entre un color y blanco o negro. */
export function contrasteCon(hex: string, contra: "blanco" | "negro"): number {
  const l = luminancia(hex);
  return contra === "blanco" ? 1.05 / (l + 0.05) : (l + 0.05) / 0.05;
}

/**
 * Color de texto que mejor contrasta sobre el color dado.
 * Evita el clásico "botón amarillo con texto blanco ilegible".
 */
export function textoSobre(hex: string): string {
  return contrasteCon(hex, "blanco") >= contrasteCon(hex, "negro")
    ? "#ffffff"
    : "#111827";
}

/** Mejor relación de contraste alcanzable con texto blanco o negro. */
export function mejorContraste(hex: string): number {
  return Math.max(contrasteCon(hex, "blanco"), contrasteCon(hex, "negro"));
}

export interface Marca {
  logoUrl: string | null;
  colorPrimario: string | null;
  tipografiaTexto: string | null;
  tipografiaTitulo: string | null;
}

/**
 * CSS de marca: sobrescribe los tokens del design system para este lavadero.
 * Se inyecta renderizado en el servidor, así no hay parpadeo de colores.
 */
export function cssDeMarca(marca: Marca): string {
  const reglas: string[] = [];

  const color = normalizarHex(marca.colorPrimario);
  if (color) {
    reglas.push(`--primary:${color}`);
    reglas.push(`--ring:${color}`);
    reglas.push(`--primary-foreground:${textoSobre(color)}`);
  }

  const texto = buscarFuente(marca.tipografiaTexto);
  reglas.push(`--fuente-texto:var(${texto.variable}),ui-sans-serif,system-ui,sans-serif`);

  const titulo = marca.tipografiaTitulo
    ? buscarFuente(marca.tipografiaTitulo)
    : texto;
  reglas.push(
    `--fuente-titulos:var(${titulo.variable}),ui-sans-serif,system-ui,sans-serif`
  );

  return `:root{${reglas.join(";")}}`;
}
