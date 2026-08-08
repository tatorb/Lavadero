import {
  Bebas_Neue,
  Inter,
  Manrope,
  Montserrat,
  Nunito,
  Oswald,
  Playfair_Display,
  Poppins,
  Rubik,
  Outfit,
} from "next/font/google";

/**
 * Catálogo de tipografías auto-hospedadas. Todas declaran su variable CSS en
 * el <html>; el navegador sólo descarga la que la marca del lavadero use
 * (por eso `preload: false` en las que no son la default).
 */
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
  preload: false,
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
  preload: false,
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  preload: false,
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
  preload: false,
});

const rubik = Rubik({
  subsets: ["latin"],
  variable: "--font-rubik",
  display: "swap",
  preload: false,
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  preload: false,
});

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
  display: "swap",
  preload: false,
});

const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-bebas",
  display: "swap",
  preload: false,
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  preload: false,
});

/** Clases con todas las variables de fuente, para aplicar en <html>. */
export const CLASES_FUENTES = [
  inter,
  poppins,
  montserrat,
  outfit,
  nunito,
  rubik,
  manrope,
  oswald,
  bebas,
  playfair,
]
  .map((f) => f.variable)
  .join(" ");
