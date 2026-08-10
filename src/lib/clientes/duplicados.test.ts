import { describe, expect, it } from "vitest";

import {
  compararClientes,
  detectarDuplicados,
  distancia,
  normalizarNombre,
  normalizarTelefono,
  pareceNoPersona,
  type ClienteParaComparar,
} from "./duplicados";

/** Helper: arma un cliente mínimo con el nombre completo en una sola cadena. */
function c(id: string, nombre: string, telefono?: string): ClienteParaComparar {
  return { id, nombre, telefono };
}

describe("normalizarNombre", () => {
  it("saca acentos, puntuación y espacios de más", () => {
    expect(normalizarNombre("  Aníbal   Pérez ")).toBe("anibal perez");
    expect(normalizarNombre("Julio (Miron)")).toBe("julio miron");
    expect(normalizarNombre("Santafesino (San Lorenzo")).toBe("santafesino san lorenzo");
  });
});

describe("normalizarTelefono", () => {
  it("compara por los últimos 10 dígitos", () => {
    expect(normalizarTelefono("+54 9 351 234-5678")).toBe("3512345678");
    expect(normalizarTelefono("0351 234 5678")).toBe("3512345678");
  });
});

describe("distancia", () => {
  it("cuenta las ediciones mínimas", () => {
    expect(distancia("tejada", "tejeda")).toBe(1);
    expect(distancia("herman santillan", "hernnan santillan")).toBe(2);
  });

  it("corta temprano cuando se pasa del máximo", () => {
    expect(distancia("joaquin", "victor", 2)).toBe(3);
  });
});

// Los pares reales que aparecieron en el registro de El Bosquecito
describe("compararClientes — casos del registro real", () => {
  const casos: [string, string, string][] = [
    ["Lucas Tejeda", "Lucas Tejada", "Difieren en una letra"],
    ["Tisiano", "Tiziano", "Difieren en una letra"],
    ["Giuly", "Gyuli", "Mismas letras en otro orden"],
    ["Gabirel", "Gabriel", "Mismas letras en otro orden"],
    ["Martin Ligouri", "Martin Liguori", "Mismas letras en otro orden"],
    ["Andres hno Mauri", "Andres Mauri hno", "Mismas palabras en otro orden"],
    ["Herman Santillan", "Hernnan Santillan", "Difieren en dos letras"],
    ["Eugenia Chabo", "Eugenia Chiabon", "Difieren en dos letras"],
    ["Gabirela Morini", "Gabriela Morini", "Mismas letras en otro orden"],
  ];

  it.each(casos)("detecta %s / %s", (a, b, motivo) => {
    const r = compararClientes(c("a", a), c("b", b));
    expect(r).not.toBeNull();
    expect(r!.motivo).toBe(motivo);
    expect(r!.confianza).not.toBe("baja");
  });

  it("marca como dudoso cuando el nombre corto es solo el de pila", () => {
    const r = compararClientes(c("a", "Cira Rodriguez"), c("b", "Cira"));
    expect(r).toEqual({
      score: 0.35,
      motivo: "Mismo nombre de pila",
      confianza: "baja",
    });
  });

  it("baja la confianza cuando solo coincide el nombre de pila", () => {
    const r = compararClientes(c("a", "Janet"), c("b", "Janet Ortiz"));
    expect(r!.confianza).toBe("baja");
  });

  it("sube a media cuando el nombre corto ya tiene dos palabras", () => {
    const r = compararClientes(c("a", "Dario Promo"), c("b", "Dario Promo Bus"));
    expect(r).toEqual({
      score: 0.6,
      motivo: "Un nombre contiene al otro",
      confianza: "media",
    });
  });
});

describe("compararClientes — casos que NO son duplicados", () => {
  it("no relaciona nombres distintos", () => {
    expect(compararClientes(c("a", "Joaquin"), c("b", "Victor"))).toBeNull();
    expect(compararClientes(c("a", "Denise"), c("b", "Nestor"))).toBeNull();
  });

  it("no relaciona apellidos distintos con el mismo nombre de pila largo", () => {
    expect(compararClientes(c("a", "Lucas Bustos"), c("b", "Lucas Gonzales"))).toBeNull();
  });

  it("ignora nombres vacíos", () => {
    expect(compararClientes(c("a", "  "), c("b", "Mario"))).toBeNull();
  });

  it("no confunde nombres cortos con una sola letra de diferencia", () => {
    // "Ema" y "Eva" difieren en una letra pero son demasiado cortos para arriesgar
    expect(compararClientes(c("a", "Ema"), c("b", "Eva"))).toBeNull();
  });

  // Todos aparecieron como falsos positivos al correrlo sobre El Bosquecito
  it.each([
    ["Mariana", "Mariano"],
    ["Daniel", "Daniela"],
    ["Gabriel", "Gabriela"],
    ["Alejandro", "Alejandra"],
    ["Viejo", "Vieja"],
    ["Mario", "Maria"],
  ])("no confunde la variante de género %s / %s", (a, b) => {
    expect(compararClientes(c("1", a), c("2", b))).toBeNull();
  });

  it.each([
    ["Dario", "Mario"],
    ["Karina", "Marina"],
    ["Marcio", "Marco"],
    ["Paula", "Laura"],
    ["Martin", "Marina"],
  ])("no relaciona nombres de pila cortos parecidos: %s / %s", (a, b) => {
    expect(compararClientes(c("1", a), c("2", b))).toBeNull();
  });

  it("no toma como anagrama dos nombres realmente distintos", () => {
    // "Santiago" y "Agostina" tienen las mismas letras pero no son la misma persona
    expect(compararClientes(c("a", "Santiago"), c("b", "Agostina"))).toBeNull();
  });

  // Estos son candidatos al vínculo pareja/familiar, no a fusión
  it.each([
    ["Lucas Bustos", "Lucas Bustos Esposa"],
    ["Jorge Filipini", "Nuri esposa Jorge Filipini"],
    ["Mauri", "Andres hno Mauri"],
    ["Consuelo", "Esposo Consuelo"],
  ])("no propone fusionar a un familiar: %s / %s", (a, b) => {
    expect(compararClientes(c("1", a), c("2", b))).toBeNull();
  });

  it("sí propone el par cuando lo que sobra es un apellido, no un parentesco", () => {
    const r = compararClientes(c("a", "Gaston Esposa"), c("b", "Gaston Vargas Esposa"));
    expect(r).toMatchObject({ motivo: "Un nombre contiene al otro", confianza: "media" });
  });
});

describe("compararClientes — teléfono", () => {
  it("el mismo teléfono es la señal más fuerte", () => {
    const r = compararClientes(
      c("a", "Marcelo Uber", "351 234 5678"),
      c("b", "Marcelo", "+5493512345678")
    );
    expect(r).toEqual({ score: 0.97, motivo: "Mismo teléfono", confianza: "alta" });
  });

  it("dos teléfonos distintos bajan la confianza aunque el nombre sea idéntico", () => {
    const r = compararClientes(
      c("a", "Lucas Tejeda", "3512345678"),
      c("b", "Lucas Tejeda", "3519998888")
    );
    expect(r!.confianza).toBe("baja");
    expect(r!.motivo).toContain("teléfonos distintos");
  });
});

// Las filas raras que quedaron en el registro de El Bosquecito
describe("pareceNoPersona", () => {
  it.each([
    ["3 Vez", "Contiene números"],
    ["Mazda Chata", "Parece un vehículo"],
    ["Santafesino (San Lorenzo", "Texto cortado"],
    ["X", "Nombre demasiado corto"],
    ["   ", "Sin nombre"],
  ])("marca %s", (nombre, motivo) => {
    expect(pareceNoPersona(nombre)).toBe(motivo);
  });

  it.each(["Joaquin", "Lucas Tejeda", "Julio (Miron)", "Nuri esposa Jorge Filipini", "Ana"])(
    "deja pasar %s",
    (nombre) => {
      expect(pareceNoPersona(nombre)).toBeNull();
    }
  );
});

describe("detectarDuplicados", () => {
  const clientes = [
    c("1", "Lucas Tejeda"),
    c("2", "Lucas Tejada"),
    c("3", "Joaquin"),
    c("4", "Janet"),
    c("5", "Janet Ortiz"),
    c("6", "Victor"),
  ];

  it("ordena por confianza y después por score", () => {
    const pares = detectarDuplicados(clientes);
    expect(pares[0]).toMatchObject({ aId: "1", bId: "2", confianza: "alta" });
    expect(pares.at(-1)).toMatchObject({ aId: "4", bId: "5", confianza: "baja" });
  });

  it("no propone un cliente consigo mismo ni repite el par invertido", () => {
    const pares = detectarDuplicados(clientes);
    const claves = pares.map((p) => [p.aId, p.bId].sort().join("-"));
    expect(new Set(claves).size).toBe(claves.length);
    expect(pares.every((p) => p.aId !== p.bId)).toBe(true);
  });

  it("respeta el tope de pares", () => {
    expect(detectarDuplicados(clientes, { maxPares: 1 })).toHaveLength(1);
  });
});
