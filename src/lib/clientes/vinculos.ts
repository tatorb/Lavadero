/**
 * Detección de vínculos familiares a partir del nombre.
 *
 * En el registro del lavadero mucha gente quedó anotada por su relación con
 * otro cliente: "Esposa Luis", "Nuri esposa Jorge Filipini", "Andres hno
 * Mauri". Son personas distintas, no duplicados, y la app ya sabe manejarlas:
 * el vínculo pareja/familiar comparte los autos y toma el mejor nivel de los
 * dos para los descuentos. Lo que faltaba era cargarlos.
 *
 * Módulo puro (sin Prisma) para poder testearlo con los nombres reales.
 */

import { normalizarNombre } from "./duplicados";

export type TipoVinculo = "PAREJA" | "FAMILIAR" | "AMIGO";

/** Palabra de parentesco (ya normalizada) → tipo de vínculo. */
const PARENTESCOS: Record<string, TipoVinculo> = {
  esposa: "PAREJA",
  esposo: "PAREJA",
  marido: "PAREJA",
  mujer: "PAREJA",
  novia: "PAREJA",
  novio: "PAREJA",
  pareja: "PAREJA",
  sra: "PAREJA",
  senora: "PAREJA",
  senor: "PAREJA",
  hijo: "FAMILIAR",
  hija: "FAMILIAR",
  hermano: "FAMILIAR",
  hermana: "FAMILIAR",
  hno: "FAMILIAR",
  hna: "FAMILIAR",
  madre: "FAMILIAR",
  padre: "FAMILIAR",
  mama: "FAMILIAR",
  papa: "FAMILIAR",
  padastro: "FAMILIAR",
  padrastro: "FAMILIAR",
  madrastra: "FAMILIAR",
  cunado: "FAMILIAR",
  cunada: "FAMILIAR",
  suegro: "FAMILIAR",
  suegra: "FAMILIAR",
  primo: "FAMILIAR",
  prima: "FAMILIAR",
  tio: "FAMILIAR",
  tia: "FAMILIAR",
  sobrino: "FAMILIAR",
  sobrina: "FAMILIAR",
  abuelo: "FAMILIAR",
  abuela: "FAMILIAR",
  nieto: "FAMILIAR",
  nieta: "FAMILIAR",
  yerno: "FAMILIAR",
  nuera: "FAMILIAR",
  amigo: "AMIGO",
  amiga: "AMIGO",
  vecino: "AMIGO",
  vecina: "AMIGO",
  companero: "AMIGO",
  empleado: "AMIGO",
  empleada: "AMIGO",
};

export const TIPO_VINCULO_LABEL: Record<TipoVinculo, string> = {
  PAREJA: "Pareja",
  FAMILIAR: "Familiar",
  AMIGO: "Amigo",
};

export function esPalabraDeParentesco(palabra: string): boolean {
  return palabra in PARENTESCOS;
}

export interface RelacionDetectada {
  /** La palabra de parentesco, normalizada */
  palabra: string;
  tipo: TipoVinculo;
  /** Nombre del titular tal como quedó anotado, o null si el registro no lo trae */
  titular: string | null;
  /** Nombre propio del dependiente, cuando el registro lo incluye */
  propio: string | null;
}

/**
 * Parte un nombre en parentesco + titular. Contempla las tres formas en que el
 * operador las anotaba:
 *
 * - `Esposa Luis`            → parentesco primero, titular después
 * - `Sergio esposa`          → titular primero, parentesco al final
 * - `Nuri esposa Jorge F.`   → nombre propio, parentesco, titular
 */
export function detectarRelacion(nombre: string): RelacionDetectada | null {
  const palabras = normalizarNombre(nombre).split(" ").filter(Boolean);
  const indice = palabras.findIndex((p) => p in PARENTESCOS);
  if (indice === -1) return null;

  const palabra = palabras[indice];
  const antes = palabras.slice(0, indice);
  const despues = palabras.slice(indice + 1);

  // "Papa": la palabra es todo el nombre, no hay a quién vincularlo
  if (antes.length === 0 && despues.length === 0) {
    return { palabra, tipo: PARENTESCOS[palabra], titular: null, propio: null };
  }

  // "Esposa Luis" / "Nuri esposa Jorge Filipini": el titular va después
  if (despues.length > 0) {
    return {
      palabra,
      tipo: PARENTESCOS[palabra],
      titular: despues.join(" "),
      propio: antes.length > 0 ? antes.join(" ") : null,
    };
  }

  // "Sergio esposa": el parentesco cierra y el titular es lo que quedó antes
  return {
    palabra,
    tipo: PARENTESCOS[palabra],
    titular: antes.join(" "),
    propio: null,
  };
}

export interface ClienteParaVincular {
  id: string;
  nombre: string;
  apellido?: string | null;
  vinculadoConId?: string | null;
}

export interface SugerenciaVinculo {
  dependienteId: string;
  titularId: string;
  tipo: TipoVinculo;
  palabra: string;
  /** Cómo describir el vínculo: "Esposa de Luis" */
  etiqueta: string;
  /** El titular ya tiene otra sugerencia o un vínculo cargado */
  titularOcupado: boolean;
  /**
   * `alta` = el nombre anotado coincide exacto con un cliente.
   * `revisar` = hubo que recortar o completar el nombre para encontrarlo, así
   * que la lectura puede ser otra ("Andres Mauri hno" es hermano de Mauri, no
   * de Andrés).
   */
  confianza: "alta" | "revisar";
}

export interface RelacionSinTitular {
  clienteId: string;
  palabra: string;
  tipo: TipoVinculo;
  /** El nombre que buscamos y no encontramos, o null si no había */
  buscado: string | null;
}

const capitalizar = (p: string) => p.charAt(0).toUpperCase() + p.slice(1);

/**
 * Busca a quién se refiere el nombre anotado. Va de lo más estricto a lo más
 * flexible porque el operador abreviaba: "Esposo Denise (Simon)" apunta a
 * Denise, "Nacho Esposo Agos" a Agostina.
 */
function resolverTitular(
  buscado: string,
  indice: Map<string, string[]>,
  normalizados: Array<{ id: string; normal: string; relacional: boolean }>,
  excluirId: string
): { id: string; exacto: boolean } | null {
  const palabras = buscado.split(" ");

  // 1. Nombre completo exacto, y después prefijos cada vez más cortos:
  //    "denise simon" no existe pero "denise" sí
  for (let corte = palabras.length; corte > 0; corte--) {
    const clave = palabras.slice(0, corte).join(" ");
    const ids = (indice.get(clave) ?? []).filter((id) => id !== excluirId);
    if (ids.length === 1) return { id: ids[0], exacto: corte === palabras.length };
    if (ids.length > 1) return null; // homónimos: que decida el operador
  }

  // 2. Abreviaturas: "agos" → "agostina". Solo si es inequívoco y el candidato
  //    no es a su vez un nombre relacional.
  const raiz = palabras[0];
  if (raiz.length >= 4) {
    const candidatos = normalizados.filter(
      (c) => c.id !== excluirId && !c.relacional && c.normal.startsWith(raiz)
    );
    if (candidatos.length === 1) return { id: candidatos[0].id, exacto: false };
  }

  return null;
}

/**
 * Recorre los clientes, detecta los que están anotados por su relación con
 * otro y propone el vínculo. Nunca lo aplica: la decisión es del operador.
 */
export function sugerirVinculos(clientes: ClienteParaVincular[]): {
  sugerencias: SugerenciaVinculo[];
  sinTitular: RelacionSinTitular[];
} {
  const nombreDe = (c: ClienteParaVincular) =>
    [c.nombre, c.apellido].filter(Boolean).join(" ");

  const normalizados = clientes.map((c) => ({
    id: c.id,
    normal: normalizarNombre(nombreDe(c)),
    relacional: detectarRelacion(nombreDe(c)) !== null,
  }));

  const indice = new Map<string, string[]>();
  for (const c of normalizados) {
    indice.set(c.normal, [...(indice.get(c.normal) ?? []), c.id]);
  }
  const porId = new Map(clientes.map((c) => [c.id, c]));

  const sugerencias: SugerenciaVinculo[] = [];
  const sinTitular: RelacionSinTitular[] = [];

  for (const cliente of clientes) {
    if (cliente.vinculadoConId) continue;
    const relacion = detectarRelacion(nombreDe(cliente));
    if (!relacion) continue;

    const titular = relacion.titular
      ? resolverTitular(relacion.titular, indice, normalizados, cliente.id)
      : null;

    if (!titular) {
      sinTitular.push({
        clienteId: cliente.id,
        palabra: relacion.palabra,
        tipo: relacion.tipo,
        buscado: relacion.titular,
      });
      continue;
    }

    sugerencias.push({
      dependienteId: cliente.id,
      titularId: titular.id,
      tipo: relacion.tipo,
      palabra: relacion.palabra,
      etiqueta: `${capitalizar(relacion.palabra)} de ${nombreDe(porId.get(titular.id)!)}`,
      titularOcupado: !!porId.get(titular.id)?.vinculadoConId,
      confianza: titular.exacto ? "alta" : "revisar",
    });
  }

  // El vínculo es uno a uno: si dos personas apuntan al mismo titular, solo la
  // primera puede cargarse. Marcamos las demás para que la UI lo avise.
  const titularesVistos = new Set<string>();
  for (const s of sugerencias) {
    if (titularesVistos.has(s.titularId)) s.titularOcupado = true;
    titularesVistos.add(s.titularId);
  }

  return { sugerencias, sinTitular };
}
