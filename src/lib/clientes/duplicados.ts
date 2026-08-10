/**
 * Detección de clientes duplicados.
 *
 * El registro histórico del lavadero se llevaba a mano, así que la misma
 * persona aparece escrita de varias formas: con y sin apellido, con el
 * apellido mal tipeado, con las palabras en otro orden. Este módulo es puro
 * (sin Prisma) para poder testearlo con los casos reales del lavadero.
 *
 * Nunca fusiona nada por su cuenta: propone pares con un motivo y un nivel de
 * confianza, y la decisión final siempre es del operador.
 */

export type Confianza = "alta" | "media" | "baja";

export interface ClienteParaComparar {
  id: string;
  nombre: string;
  apellido?: string | null;
  telefono?: string | null;
  email?: string | null;
}

export interface ParDuplicado {
  aId: string;
  bId: string;
  score: number;
  motivo: string;
  confianza: Confianza;
}

/** Minúsculas, sin acentos, sin puntuación y con espacios colapsados. */
export function normalizarNombre(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Deja solo los dígitos y descarta el prefijo de país/área para comparar. */
export function normalizarTelefono(telefono: string): string {
  const digitos = telefono.replace(/\D/g, "");
  return digitos.length > 10 ? digitos.slice(-10) : digitos;
}

/** Distancia de Levenshtein con corte temprano: si supera `max`, devuelve max+1. */
export function distancia(a: string, b: string, max = 3): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let previa = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const actual = [i];
    let mejorFila = i;
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      const valor = Math.min(actual[j - 1] + 1, previa[j] + 1, previa[j - 1] + costo);
      actual.push(valor);
      if (valor < mejorFila) mejorFila = valor;
    }
    if (mejorFila > max) return max + 1;
    previa = actual;
  }
  return previa[b.length];
}

/** Firma de anagrama: las mismas letras en cualquier orden. */
function letrasOrdenadas(texto: string): string {
  return texto.replace(/\s/g, "").split("").sort().join("");
}

function mismasPalabras(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const ordA = [...a].sort();
  const ordB = [...b].sort();
  return ordA.every((p, i) => p === ordB[i]);
}

/** Palabras de `grande` que no quedaron consumidas por `chico`. */
function diferenciaPalabras(chico: string[], grande: string[]): string[] {
  const restantes = [...grande];
  for (const palabra of chico) {
    const i = restantes.indexOf(palabra);
    if (i !== -1) restantes.splice(i, 1);
  }
  return restantes;
}

function esSubconjunto(chico: string[], grande: string[]): boolean {
  const disponibles = [...grande];
  for (const palabra of chico) {
    const i = disponibles.indexOf(palabra);
    if (i === -1) return false;
    disponibles.splice(i, 1);
  }
  return true;
}

function nombreCompleto(c: ClienteParaComparar): string {
  return normalizarNombre([c.nombre, c.apellido].filter(Boolean).join(" "));
}

/**
 * En el registro hay muchos clientes anotados por su relación con otro
 * ("Lucas Bustos Esposa", "Nuri esposa Jorge Filipini"). Son personas
 * distintas, no duplicados: candidatas al vínculo pareja/familiar.
 */
const PALABRAS_RELACION = new Set([
  "esposa",
  "esposo",
  "sra",
  "señora",
  "senora",
  "novia",
  "novio",
  "hijo",
  "hija",
  "hermano",
  "hermana",
  "hno",
  "hna",
  "madre",
  "padre",
  "mama",
  "papa",
  "padrastro",
  "madrastra",
  "cunado",
  "cunada",
  "suegro",
  "suegra",
  "primo",
  "prima",
  "tio",
  "tia",
  "yerno",
  "nuera",
  "amigo",
  "amiga",
  "empleado",
  "empleada",
  "vecino",
  "vecina",
]);

/**
 * Variante de género del mismo nombre: Mariana/Mariano, Daniel/Daniela,
 * Alejandro/Alejandra, Viejo/Vieja. Son personas distintas, no un error de
 * tipeo, y la distancia de edición no las puede diferenciar por sí sola.
 */
function esVarianteDeGenero(a: string, b: string): boolean {
  if (a === b) return false;
  const raiz = (p: string) => p.replace(/[aoe]$/, "");
  return raiz(a) === raiz(b);
}

/** Todas las palabras coinciden salvo por el género de alguna. */
function soloCambiaElGenero(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  let alguna = false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    if (!esVarianteDeGenero(a[i], b[i])) return false;
    alguna = true;
  }
  return alguna;
}

interface Coincidencia {
  score: number;
  motivo: string;
  confianza: Confianza;
}

/**
 * Compara dos clientes y devuelve la mejor razón para sospechar que son la
 * misma persona, o null si no hay ninguna.
 */
export function compararClientes(
  a: ClienteParaComparar,
  b: ClienteParaComparar
): Coincidencia | null {
  const nombreA = nombreCompleto(a);
  const nombreB = nombreCompleto(b);
  if (!nombreA || !nombreB) return null;

  const telA = a.telefono ? normalizarTelefono(a.telefono) : "";
  const telB = b.telefono ? normalizarTelefono(b.telefono) : "";
  const mismoTelefono = telA.length >= 8 && telA === telB;
  // Dos teléfonos distintos son evidencia en contra: la coincidencia de nombre
  // puede ser real (padre e hijo, homónimos) pero ya no alcanza para fusionar.
  const telefonosDistintos = telA.length >= 8 && telB.length >= 8 && telA !== telB;

  const palabrasA = nombreA.split(" ");
  const palabrasB = nombreB.split(" ");

  if (soloCambiaElGenero(palabrasA, palabrasB)) return null;

  const candidatas: Coincidencia[] = [];

  if (mismoTelefono) {
    candidatas.push({ score: 0.97, motivo: "Mismo teléfono", confianza: "alta" });
  }

  if (nombreA === nombreB) {
    candidatas.push({ score: 0.95, motivo: "Nombre idéntico", confianza: "alta" });
  } else if (mismasPalabras(palabrasA, palabrasB)) {
    candidatas.push({
      score: 0.88,
      motivo: "Mismas palabras en otro orden",
      confianza: "alta",
    });
  } else {
    const largoMin = Math.min(nombreA.length, nombreB.length);
    const dist = distancia(nombreA, nombreB);
    // Un error de tipeo sobre un nombre completo es evidencia fuerte; sobre un
    // nombre de pila suelto, no: media Argentina se llama Mario, María, Marina
    // y Marcio, y ninguno es el otro.
    const nombreCompletoAmbos = palabrasA.length >= 2 && palabrasB.length >= 2;
    const anagrama = letrasOrdenadas(nombreA) === letrasOrdenadas(nombreB);

    if (anagrama && dist <= 2 && largoMin >= 4) {
      candidatas.push({
        score: 0.82,
        motivo: "Mismas letras en otro orden",
        confianza: "alta",
      });
    } else if (nombreCompletoAmbos && dist === 1) {
      candidatas.push({ score: 0.85, motivo: "Difieren en una letra", confianza: "alta" });
    } else if (nombreCompletoAmbos && dist <= 2 && largoMin >= 8) {
      candidatas.push({ score: 0.75, motivo: "Difieren en dos letras", confianza: "media" });
    } else if (!nombreCompletoAmbos && dist === 1 && largoMin >= 7) {
      candidatas.push({ score: 0.6, motivo: "Difieren en una letra", confianza: "media" });
    } else if (!nombreCompletoAmbos && dist <= 2 && largoMin >= 7) {
      candidatas.push({ score: 0.4, motivo: "Difieren en dos letras", confianza: "baja" });
    }

    // "Cira" / "Cira Rodriguez": uno es el nombre completo del otro
    if (palabrasA.length !== palabrasB.length) {
      const [chico, grande] =
        palabrasA.length < palabrasB.length ? [palabrasA, palabrasB] : [palabrasB, palabrasA];
      const extra = diferenciaPalabras(chico, grande);
      // "Jorge Filipini" y "Nuri esposa Jorge Filipini" son dos personas
      const esOtroFamiliar = extra.some((p) => PALABRAS_RELACION.has(p));

      if (esSubconjunto(chico, grande) && !esOtroFamiliar) {
        candidatas.push(
          chico.length >= 2
            ? { score: 0.6, motivo: "Un nombre contiene al otro", confianza: "media" }
            : { score: 0.35, motivo: "Mismo nombre de pila", confianza: "baja" }
        );
      }
    }
  }

  if (candidatas.length === 0) return null;
  const mejor = candidatas.reduce((m, c) => (c.score > m.score ? c : m));

  if (telefonosDistintos) {
    return {
      score: mejor.score - 0.4,
      motivo: `${mejor.motivo} · teléfonos distintos`,
      confianza: "baja",
    };
  }
  return mejor;
}

// Sin "Mercedes": es marca de auto pero también un nombre de persona común
const MARCAS_AUTO = [
  "chevrolet",
  "citroen",
  "fiat",
  "ford",
  "honda",
  "hyundai",
  "jeep",
  "kia",
  "mazda",
  "nissan",
  "peugeot",
  "renault",
  "toyota",
  "volkswagen",
];

/**
 * Detecta filas del registro histórico que no son personas: el operador
 * anotaba a veces el auto, la cantidad de visitas o un texto cortado en la
 * columna del nombre. Devuelve el motivo, o null si parece una persona.
 */
export function pareceNoPersona(nombre: string): string | null {
  const normal = normalizarNombre(nombre);
  if (!normal) return "Sin nombre";
  if (normal.length <= 2) return "Nombre demasiado corto";

  const palabras = normal.split(" ");
  // Un token que es solo dígitos ("3 Vez", "295000") viene de una columna
  // corrida; "Esteban V6" es una persona con una nota sobre el auto.
  if (palabras.some((p) => /^\d+$/.test(p))) return "Contiene números";

  const abre = (nombre.match(/\(/g) ?? []).length;
  const cierra = (nombre.match(/\)/g) ?? []).length;
  if (abre !== cierra) return "Texto cortado";

  const primera = palabras[0];
  if (MARCAS_AUTO.includes(primera)) return "Parece un vehículo";

  return null;
}

const ORDEN_CONFIANZA: Record<Confianza, number> = { alta: 0, media: 1, baja: 2 };

/**
 * Recorre todos los pares y devuelve los sospechosos, del más probable al
 * menos. Cada cliente puede aparecer en varios pares (la decisión es humana).
 */
export function detectarDuplicados(
  clientes: ClienteParaComparar[],
  opciones: { maxPares?: number } = {}
): ParDuplicado[] {
  const pares: ParDuplicado[] = [];

  for (let i = 0; i < clientes.length; i++) {
    for (let j = i + 1; j < clientes.length; j++) {
      const coincidencia = compararClientes(clientes[i], clientes[j]);
      if (!coincidencia) continue;
      pares.push({
        aId: clientes[i].id,
        bId: clientes[j].id,
        score: coincidencia.score,
        motivo: coincidencia.motivo,
        confianza: coincidencia.confianza,
      });
    }
  }

  pares.sort(
    (x, y) =>
      ORDEN_CONFIANZA[x.confianza] - ORDEN_CONFIANZA[y.confianza] || y.score - x.score
  );
  return opciones.maxPares ? pares.slice(0, opciones.maxPares) : pares;
}
