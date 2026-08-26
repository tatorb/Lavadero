import { describe, expect, it } from "vitest";

import {
  calcularDuraciones,
  cortarPor,
  esMedible,
  formatMinutos,
  type LavadoMedido,
} from "./duraciones";

const MIN = 60_000;
const base = new Date("2026-08-10T13:00:00Z").getTime();

/** Lavado con los tramos en minutos desde la llegada. */
function lavado(
  opts: Partial<LavadoMedido> & { espera?: number; dura?: number; entrega?: number } = {}
): LavadoMedido {
  const { espera = 10, dura = 40, entrega = 5, ...resto } = opts;
  const inicio = base + espera * MIN;
  const fin = inicio + dura * MIN;
  return {
    servicio: "Lavado normal",
    tipoVehiculo: "AUTO",
    llegadaMs: base,
    inicioMs: inicio,
    finMs: fin,
    entregadoMs: fin + entrega * MIN,
    tiemposReales: true,
    ...resto,
  };
}

describe("esMedible", () => {
  it("acepta un lavado con tiempos reales y completos", () => {
    expect(esMedible(lavado())).toBe(true);
  });

  it("descarta los lavados sin tiempos medidos", () => {
    expect(esMedible(lavado({ tiemposReales: false }))).toBe(false);
  });

  it("descarta los que no llegaron a terminar", () => {
    expect(esMedible(lavado({ finMs: null }))).toBe(false);
    expect(esMedible(lavado({ inicioMs: null }))).toBe(false);
  });

  it("descarta los tramos negativos", () => {
    const l = lavado();
    expect(esMedible({ ...l, finMs: l.inicioMs! - MIN })).toBe(false);
  });
});

describe("calcularDuraciones", () => {
  it("promedia cada tramo", () => {
    const d = calcularDuraciones([
      lavado({ espera: 10, dura: 40, entrega: 5 }),
      lavado({ espera: 20, dura: 60, entrega: 15 }),
    ]);
    expect(d).toMatchObject({
      muestra: 2,
      espera: 15,
      lavado: 50,
      entrega: 10,
      total: 75, // (55 + 95) / 2
      lavadoMin: 40,
      lavadoMax: 60,
    });
  });

  it("no deja que los tiempos fabricados muevan el promedio", () => {
    const reales = [lavado({ dura: 40 }), lavado({ dura: 50 })];
    const inventados = [
      lavado({ dura: 45, tiemposReales: false }),
      lavado({ dura: 45, tiemposReales: false }),
    ];
    const soloReales = calcularDuraciones(reales);
    expect(calcularDuraciones([...reales, ...inventados])).toEqual(soloReales);
    expect(soloReales.muestra).toBe(2);
  });

  it("devuelve todo en null cuando no hay nada medible", () => {
    expect(calcularDuraciones([lavado({ tiemposReales: false })])).toEqual({
      muestra: 0,
      espera: null,
      lavado: null,
      entrega: null,
      total: null,
      lavadoMin: null,
      lavadoMax: null,
    });
  });

  it("cuenta el lavado aunque todavía no se haya entregado", () => {
    const d = calcularDuraciones([lavado({ dura: 30, entregadoMs: null })]);
    expect(d.lavado).toBe(30);
    expect(d.entrega).toBeNull();
    expect(d.total).toBeNull();
  });

  it("ignora la espera cuando el inicio es anterior a la llegada", () => {
    const l = lavado();
    const d = calcularDuraciones([{ ...l, inicioMs: l.llegadaMs - MIN, finMs: l.llegadaMs + 10 * MIN }]);
    expect(d.espera).toBeNull();
    expect(d.lavado).toBe(11);
  });
});

describe("cortarPor", () => {
  const lavados = [
    lavado({ dura: 30, tipoVehiculo: "AUTO" }),
    lavado({ dura: 50, tipoVehiculo: "AUTO" }),
    lavado({ dura: 90, tipoVehiculo: "PICKUP" }),
    lavado({ dura: 60, tipoVehiculo: "MOTO", tiemposReales: false }),
  ];

  it("agrupa y ordena del más lento al más rápido", () => {
    const cortes = cortarPor(lavados, (l) => l.tipoVehiculo);
    expect(cortes.map((c) => c.clave)).toEqual(["PICKUP", "AUTO"]);
    expect(cortes[0].duraciones.lavado).toBe(90);
    expect(cortes[1].duraciones).toMatchObject({ lavado: 40, muestra: 2 });
  });

  it("deja fuera los grupos que solo tienen tiempos fabricados", () => {
    const cortes = cortarPor(lavados, (l) => l.tipoVehiculo);
    expect(cortes.some((c) => c.clave === "MOTO")).toBe(false);
  });
});

describe("formatMinutos", () => {
  it.each([
    [null, "—"],
    [0, "0 min"],
    [45, "45 min"],
    [60, "1 h"],
    [85, "1 h 25 min"],
  ])("formatea %s", (entrada, esperado) => {
    expect(formatMinutos(entrada as number | null)).toBe(esperado);
  });
});
