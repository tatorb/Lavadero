import { describe, expect, it } from "vitest";

import {
  detectarRelacion,
  sugerirVinculos,
  type ClienteParaVincular,
} from "./vinculos";

describe("detectarRelacion", () => {
  it("lee el parentesco adelante y el titular atrás", () => {
    expect(detectarRelacion("Esposa Luis")).toEqual({
      palabra: "esposa",
      tipo: "PAREJA",
      titular: "luis",
      propio: null,
    });
    expect(detectarRelacion("Hna Mariana")).toMatchObject({
      tipo: "FAMILIAR",
      titular: "mariana",
    });
    expect(detectarRelacion("Amiga Victor")).toMatchObject({
      tipo: "AMIGO",
      titular: "victor",
    });
  });

  it("lee el titular adelante cuando el parentesco cierra el nombre", () => {
    expect(detectarRelacion("Sergio esposa")).toMatchObject({
      titular: "sergio",
      propio: null,
    });
    expect(detectarRelacion("Lucas Bustos Esposa")).toMatchObject({
      titular: "lucas bustos",
    });
    expect(detectarRelacion("Marina hija")).toMatchObject({
      tipo: "FAMILIAR",
      titular: "marina",
    });
  });

  it("separa nombre propio, parentesco y titular", () => {
    expect(detectarRelacion("Nuri esposa Jorge Filipini")).toEqual({
      palabra: "esposa",
      tipo: "PAREJA",
      titular: "jorge filipini",
      propio: "nuri",
    });
    expect(detectarRelacion("Andres hno Mauri")).toMatchObject({
      tipo: "FAMILIAR",
      titular: "mauri",
      propio: "andres",
    });
    expect(detectarRelacion("Maxi cuñado Bauti")).toMatchObject({
      tipo: "FAMILIAR",
      titular: "bauti",
      propio: "maxi",
    });
  });

  it("ignora los paréntesis", () => {
    expect(detectarRelacion("Veronica (Esposo)")).toMatchObject({
      titular: "veronica",
    });
    expect(detectarRelacion("Esposo Denise (Simon)")).toMatchObject({
      titular: "denise simon",
    });
  });

  it("devuelve el parentesco sin titular cuando el nombre es solo la palabra", () => {
    expect(detectarRelacion("Papa")).toEqual({
      palabra: "papa",
      tipo: "FAMILIAR",
      titular: null,
      propio: null,
    });
  });

  it("no marca nombres sin parentesco", () => {
    expect(detectarRelacion("Joaquin")).toBeNull();
    expect(detectarRelacion("Lucas Tejeda")).toBeNull();
    expect(detectarRelacion("Dario Promo Bus")).toBeNull();
    expect(detectarRelacion("Mariano")).toBeNull();
  });
});

describe("sugerirVinculos", () => {
  const armar = (nombres: string[]): ClienteParaVincular[] =>
    nombres.map((nombre, i) => ({ id: `c${i}`, nombre }));

  it("vincula al titular cuando el nombre coincide exacto", () => {
    const clientes = armar(["Luis", "Esposa Luis", "Joaquin"]);
    const { sugerencias } = sugerirVinculos(clientes);
    expect(sugerencias).toHaveLength(1);
    expect(sugerencias[0]).toMatchObject({
      dependienteId: "c1",
      titularId: "c0",
      tipo: "PAREJA",
      etiqueta: "Esposa de Luis",
      confianza: "alta",
    });
  });

  it("recorta el nombre buscado hasta encontrar al titular, pero pide revisarlo", () => {
    // "Esposo Denise (Simon)" apunta a Denise; "denise simon" no existe
    const { sugerencias } = sugerirVinculos(armar(["Denise", "Esposo Denise (Simon)"]));
    expect(sugerencias[0]).toMatchObject({
      titularId: "c0",
      etiqueta: "Esposo de Denise",
      confianza: "revisar",
    });
  });

  it("resuelve abreviaturas inequívocas y las marca para revisar", () => {
    const { sugerencias } = sugerirVinculos(armar(["Agostina", "Nacho Esposo Agos"]));
    expect(sugerencias[0]).toMatchObject({ titularId: "c0", confianza: "revisar" });
  });

  it("marca para revisar la lectura ambigua del parentesco al final", () => {
    // "Andres Mauri hno" es el hermano de Mauri, no de Andrés: el titular que
    // encontramos recortando puede ser el equivocado
    const { sugerencias } = sugerirVinculos(armar(["Andres", "Mauri", "Andres Mauri hno"]));
    expect(sugerencias[0]).toMatchObject({ titularId: "c0", confianza: "revisar" });
  });

  it("no adivina cuando la abreviatura da varios candidatos", () => {
    const { sugerencias, sinTitular } = sugerirVinculos(
      armar(["Agostina", "Agostino", "Nacho Esposo Agos"])
    );
    expect(sugerencias).toHaveLength(0);
    expect(sinTitular[0]).toMatchObject({ clienteId: "c2", buscado: "agos" });
  });

  it("no adivina cuando hay homónimos exactos", () => {
    const { sugerencias, sinTitular } = sugerirVinculos(
      armar(["Luis", "Luis", "Esposa Luis"])
    );
    expect(sugerencias).toHaveLength(0);
    expect(sinTitular).toHaveLength(1);
  });

  it("reporta como sin titular al que no tiene a quién apuntar", () => {
    const { sugerencias, sinTitular } = sugerirVinculos(armar(["Papa", "Graciela Cuñada"]));
    expect(sugerencias).toHaveLength(0);
    expect(sinTitular).toEqual([
      { clienteId: "c0", palabra: "papa", tipo: "FAMILIAR", buscado: null },
      { clienteId: "c1", palabra: "cunada", tipo: "FAMILIAR", buscado: "graciela" },
    ]);
  });

  it("avisa cuando dos personas apuntan al mismo titular", () => {
    // El vínculo es uno a uno: Mariana no puede estar con los dos
    const { sugerencias } = sugerirVinculos(
      armar(["Mariana", "Esposo Mariana", "Hna Mariana"])
    );
    expect(sugerencias).toHaveLength(2);
    expect(sugerencias[0].titularOcupado).toBe(false);
    expect(sugerencias[1].titularOcupado).toBe(true);
  });

  it("avisa cuando el titular ya está vinculado con otro", () => {
    const clientes: ClienteParaVincular[] = [
      { id: "c0", nombre: "Luis", vinculadoConId: "otro" },
      { id: "c1", nombre: "Esposa Luis" },
    ];
    expect(sugerirVinculos(clientes).sugerencias[0].titularOcupado).toBe(true);
  });

  it("no propone nada para quien ya tiene vínculo cargado", () => {
    const clientes: ClienteParaVincular[] = [
      { id: "c0", nombre: "Luis" },
      { id: "c1", nombre: "Esposa Luis", vinculadoConId: "c0" },
    ];
    expect(sugerirVinculos(clientes).sugerencias).toHaveLength(0);
  });

  it("no se vincula a sí mismo", () => {
    // "Esposa" y el titular "esposa" serían el mismo registro
    const { sugerencias } = sugerirVinculos(armar(["Esposa Esposa"]));
    expect(sugerencias).toHaveLength(0);
  });
});
