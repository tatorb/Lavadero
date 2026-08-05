import type { TipoVehiculo } from "@prisma/client";

/** Normalización de nombres con errores de tipeo conocidos del registro. */
export const NOMBRES_NORMALIZADOS: Record<string, string> = {
  gyuli: "Giuly",
  joaquin: "Joaquín",
  "joaquín": "Joaquín",
  martin: "Martín",
  anibal: "Aníbal",
  "aníbal": "Aníbal",
  patrci: "Patricia",
  patrcia: "Patricia",
  "esposo patrci": "Esposo Patricia",
  "hernnan santillan": "Hernán Santillán",
  "herman santillan": "Hernán Santillán",
  "joquin nuevo": "Joaquín Nuevo",
  "marcelo uber": "Marcelo Uber",
  "gullermo ruiz": "Guillermo Ruiz",
  "gabirel": "Gabriel",
  "verónica": "Veronica",
  "lucas tejada": "Lucas Tejeda",
  "eugenia chiabon": "Eugenia Chabo",
  "victor": "Víctor",
  "víctor": "Víctor",
};

/** Nombres que corresponden a familiares del dueño (cortesías habituales). */
export const NOMBRES_FAMILIARES = ["viejo", "vieja", "papa", "papá"];

/** Normalización de modelos con errores de tipeo. */
export const MODELOS_NORMALIZADOS: Record<string, string> = {
  maverik: "Maverick",
  maveric: "Maverick",
  rengade: "Renegade",
  kango: "Kangoo",
  kaango: "Kangoo",
  captus: "Captur",
  capture: "Captur",
  hiliux: "Hilux",
  kics: "Kicks",
  kick: "Kicks",
  eco: "EcoSport",
  "eco sport": "EcoSport",
  ecosport: "EcoSport",
  chevlolet: "Chevrolet",
  "citroen c3": "C3",
  citroën: "Citroën",
  dusster: "Duster",
  reanult: "Renault",
  clasisc: "Classic",
  berloingo: "Berlingo",
  berlingio: "Berlingo",
  saveriro: "Saveiro",
  "gol trend": "Gol Trend",
  goltrend: "Gol Trend",
  suram: "Suran",
  yarias: "Yaris",
  koes: "Koleos",
  tida: "Tiida",
  susuki: "Suzuki",
  shaval: "Haval",
  speway: "Stepway",
  "máster": "Master",
  izusu: "Isuzu",
  "sw4": "SW4",
  "hrv": "HR-V",
  "crv": "CR-V",
  "mercedez  familiar": "Mercedes Familiar",
};

interface InfoModelo {
  marca: string;
  tipo: TipoVehiculo;
}

/** Marca y tipo de vehículo inferidos por modelo (los más frecuentes del registro). */
export const INFO_MODELOS: Record<string, InfoModelo> = {
  // Pickups
  amarok: { marca: "Volkswagen", tipo: "PICKUP" },
  hilux: { marca: "Toyota", tipo: "PICKUP" },
  ranger: { marca: "Ford", tipo: "PICKUP" },
  alaskan: { marca: "Renault", tipo: "PICKUP" },
  maverick: { marca: "Ford", tipo: "PICKUP" },
  s10: { marca: "Chevrolet", tipo: "PICKUP" },
  l200: { marca: "Mitsubishi", tipo: "PICKUP" },
  raptor: { marca: "Ford", tipo: "PICKUP_GRANDE" },
  toro: { marca: "Fiat", tipo: "PICKUP" },
  strada: { marca: "Fiat", tipo: "PICKUP" },
  saveiro: { marca: "Volkswagen", tipo: "PICKUP" },
  tornado: { marca: "Chevrolet", tipo: "PICKUP" },
  frontier: { marca: "Nissan", tipo: "PICKUP" },
  "hilux gr": { marca: "Toyota", tipo: "PICKUP_GRANDE" },
  "mazda chata": { marca: "Mazda", tipo: "PICKUP" },
  "chevrolet chata": { marca: "Chevrolet", tipo: "PICKUP" },
  sorento: { marca: "Kia", tipo: "SUV" },
  // Utilitarios
  kangoo: { marca: "Renault", tipo: "UTILITARIO" },
  berlingo: { marca: "Citroën", tipo: "UTILITARIO" },
  fiorino: { marca: "Fiat", tipo: "UTILITARIO" },
  master: { marca: "Renault", tipo: "UTILITARIO_GRANDE" },
  vito: { marca: "Mercedes-Benz", tipo: "UTILITARIO" },
  cubo: { marca: "Fiat", tipo: "UTILITARIO" },
  furgoneta: { marca: "—", tipo: "UTILITARIO" },
  "fiat utilitaria": { marca: "Fiat", tipo: "UTILITARIO" },
  "citroen furgo": { marca: "Citroën", tipo: "UTILITARIO" },
  "zanella utilitario": { marca: "Zanella", tipo: "UTILITARIO" },
  partner: { marca: "Peugeot", tipo: "UTILITARIO" },
  // SUVs
  montero: { marca: "Mitsubishi", tipo: "SUV" },
  duster: { marca: "Renault", tipo: "SUV" },
  tracker: { marca: "Chevrolet", tipo: "SUV" },
  "hr-v": { marca: "Honda", tipo: "SUV" },
  "cr-v": { marca: "Honda", tipo: "SUV" },
  renegade: { marca: "Jeep", tipo: "SUV" },
  compass: { marca: "Jeep", tipo: "SUV" },
  jeep: { marca: "Jeep", tipo: "SUV" },
  tucson: { marca: "Hyundai", tipo: "SUV" },
  sw4: { marca: "Toyota", tipo: "SUV" },
  taos: { marca: "Volkswagen", tipo: "SUV" },
  "t cross": { marca: "Volkswagen", tipo: "SUV" },
  "t-cross": { marca: "Volkswagen", tipo: "SUV" },
  nivus: { marca: "Volkswagen", tipo: "SUV" },
  kicks: { marca: "Nissan", tipo: "SUV" },
  ecosport: { marca: "Ford", tipo: "SUV" },
  captur: { marca: "Renault", tipo: "SUV" },
  "2008": { marca: "Peugeot", tipo: "SUV" },
  "3008": { marca: "Peugeot", tipo: "SUV" },
  koleos: { marca: "Renault", tipo: "SUV" },
  creta: { marca: "Hyundai", tipo: "SUV" },
  haval: { marca: "Haval", tipo: "SUV" },
  spin: { marca: "Chevrolet", tipo: "SUV" },
  suran: { marca: "Volkswagen", tipo: "SUV" },
  koleo: { marca: "Renault", tipo: "SUV" },
  "santa fe": { marca: "Hyundai", tipo: "SUV" },
  "yaris cross": { marca: "Toyota", tipo: "SUV" },
  "corolla cros": { marca: "Toyota", tipo: "SUV" },
  china: { marca: "—", tipo: "SUV" },
  sentra: { marca: "Nissan", tipo: "AUTO" },
  // Motos y otros
  moto: { marca: "—", tipo: "MOTO" },
  motorhome: { marca: "—", tipo: "MOTORHOME" },
  utv: { marca: "—", tipo: "UTV" },
  // Autos frecuentes
  corolla: { marca: "Toyota", tipo: "AUTO" },
  etios: { marca: "Toyota", tipo: "AUTO" },
  yaris: { marca: "Toyota", tipo: "AUTO" },
  cronos: { marca: "Fiat", tipo: "AUTO" },
  classic: { marca: "Chevrolet", tipo: "AUTO" },
  cruze: { marca: "Chevrolet", tipo: "AUTO" },
  onix: { marca: "Chevrolet", tipo: "AUTO" },
  prisma: { marca: "Chevrolet", tipo: "AUTO" },
  agile: { marca: "Chevrolet", tipo: "AUTO" },
  joy: { marca: "Chevrolet", tipo: "AUTO" },
  ka: { marca: "Ford", tipo: "AUTO" },
  fiesta: { marca: "Ford", tipo: "AUTO" },
  focus: { marca: "Ford", tipo: "AUTO" },
  fox: { marca: "Volkswagen", tipo: "AUTO" },
  gol: { marca: "Volkswagen", tipo: "AUTO" },
  "gol power": { marca: "Volkswagen", tipo: "AUTO" },
  "gol trend": { marca: "Volkswagen", tipo: "AUTO" },
  "gol country": { marca: "Volkswagen", tipo: "AUTO" },
  voyage: { marca: "Volkswagen", tipo: "AUTO" },
  vento: { marca: "Volkswagen", tipo: "AUTO" },
  virtus: { marca: "Volkswagen", tipo: "AUTO" },
  polo: { marca: "Volkswagen", tipo: "AUTO" },
  up: { marca: "Volkswagen", tipo: "AUTO" },
  bora: { marca: "Volkswagen", tipo: "AUTO" },
  megane: { marca: "Renault", tipo: "AUTO" },
  "megane 2": { marca: "Renault", tipo: "AUTO" },
  clio: { marca: "Renault", tipo: "AUTO" },
  sandero: { marca: "Renault", tipo: "AUTO" },
  stepway: { marca: "Renault", tipo: "AUTO" },
  kwid: { marca: "Renault", tipo: "AUTO" },
  versa: { marca: "Nissan", tipo: "AUTO" },
  tiida: { marca: "Nissan", tipo: "AUTO" },
  note: { marca: "Nissan", tipo: "AUTO" },
  c3: { marca: "Citroën", tipo: "AUTO" },
  c4: { marca: "Citroën", tipo: "AUTO" },
  "207": { marca: "Peugeot", tipo: "AUTO" },
  "208": { marca: "Peugeot", tipo: "AUTO" },
  "307": { marca: "Peugeot", tipo: "AUTO" },
  "308": { marca: "Peugeot", tipo: "AUTO" },
  "308 gt": { marca: "Peugeot", tipo: "AUTO" },
  "504": { marca: "Peugeot", tipo: "AUTO" },
  "siena": { marca: "Fiat", tipo: "AUTO" },
  "fiat uno": { marca: "Fiat", tipo: "AUTO" },
  uno: { marca: "Fiat", tipo: "AUTO" },
  palio: { marca: "Fiat", tipo: "AUTO" },
  "palio adventure": { marca: "Fiat", tipo: "AUTO" },
  mobi: { marca: "Fiat", tipo: "AUTO" },
  argo: { marca: "Fiat", tipo: "AUTO" },
  "fiat tipo": { marca: "Fiat", tipo: "AUTO" },
  "fiat idea": { marca: "Fiat", tipo: "AUTO" },
  pulse: { marca: "Fiat", tipo: "SUV" },
  "500": { marca: "Fiat", tipo: "AUTO" },
  fit: { marca: "Honda", tipo: "AUTO" },
  city: { marca: "Honda", tipo: "AUTO" },
  civic: { marca: "Honda", tipo: "AUTO" },
  "mercedes 300": { marca: "Mercedes-Benz", tipo: "AUTO" },
  a4: { marca: "Audi", tipo: "AUTO" },
  audi: { marca: "Audi", tipo: "AUTO" },
  mg: { marca: "MG", tipo: "AUTO" },
  falcon: { marca: "Ford", tipo: "AUTO" },
  kuga: { marca: "Ford", tipo: "SUV" },
  hyundai: { marca: "Hyundai", tipo: "AUTO" },
  goltrend: { marca: "Volkswagen", tipo: "AUTO" },
};

/** Orígenes conocidos: patrón → valor normalizado. */
export const ORIGENES: Array<[RegExp, string]> = [
  [/gomeria|gomería/i, "Gomería"],
  [/facebook/i, "Facebook"],
  [/instagram|redes/i, "Instagram / redes"],
  [/pauta/i, "Pauta"],
  [/maps|google/i, "Google Maps"],
  [/grupo/i, "Grupo de vecinos"],
  [/boca en boca/i, "Boca en boca"],
  [/recomendacion|recomendación/i, "Recomendación"],
  [/sorteo/i, "Sorteo"],
  [/uber/i, "Uber"],
  [/pasada|vio el cartel/i, "De pasada"],
  [/cliente anterior/i, "Cliente anterior"],
];

export function normalizarClave(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizarNombre(original: string): string {
  const clave = normalizarClave(original);
  if (NOMBRES_NORMALIZADOS[clave]) return NOMBRES_NORMALIZADOS[clave];
  // Capitalización básica conservando el resto del texto
  return original.replace(/\s+/g, " ").trim();
}

export function normalizarModelo(original: string): string {
  const clave = normalizarClave(original);
  if (MODELOS_NORMALIZADOS[clave]) return MODELOS_NORMALIZADOS[clave];
  return original.replace(/\s+/g, " ").trim();
}

export function infoModelo(modeloNormalizado: string): InfoModelo {
  const clave = normalizarClave(modeloNormalizado);
  if (INFO_MODELOS[clave]) return INFO_MODELOS[clave];
  // Heurística por palabras clave
  if (/moto/.test(clave)) return { marca: "—", tipo: "MOTO" };
  if (/motorhome/.test(clave)) return { marca: "—", tipo: "MOTORHOME" };
  if (/utv/.test(clave)) return { marca: "—", tipo: "UTV" };
  if (/chata|pickup/.test(clave)) return { marca: "—", tipo: "PICKUP" };
  if (/furgo|utilit/.test(clave)) return { marca: "—", tipo: "UTILITARIO" };
  return { marca: "—", tipo: "AUTO" };
}

export function detectarOrigen(texto: string): string | null {
  for (const [patron, valor] of ORIGENES) {
    if (patron.test(texto)) return valor;
  }
  return null;
}
