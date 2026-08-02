import { describe, expect, it } from "vitest";

import { calcularNivel, calcularNuevaRacha, type NivelInfo } from "./niveles";

const NIVELES: NivelInfo[] = [
  { id: "1", nombre: "Bronce", orden: 1, puntosMin: 0, color: null },
  { id: "2", nombre: "Plata", orden: 2, puntosMin: 200, color: null },
  { id: "3", nombre: "Oro", orden: 3, puntosMin: 500, color: null },
];

describe("calcularNivel", () => {
  it("cliente nuevo arranca en Bronce con progreso 0", () => {
    const r = calcularNivel(0, NIVELES);
    expect(r.nivelActual?.nombre).toBe("Bronce");
    expect(r.nivelSiguiente?.nombre).toBe("Plata");
    expect(r.progreso).toBe(0);
    expect(r.puntosParaSiguiente).toBe(200);
  });

  it("progreso a mitad de camino entre Bronce y Plata", () => {
    const r = calcularNivel(100, NIVELES);
    expect(r.nivelActual?.nombre).toBe("Bronce");
    expect(r.progreso).toBeCloseTo(0.5);
  });

  it("justo en el umbral sube de nivel", () => {
    const r = calcularNivel(200, NIVELES);
    expect(r.nivelActual?.nombre).toBe("Plata");
    expect(r.nivelSiguiente?.nombre).toBe("Oro");
    expect(r.progreso).toBe(0);
  });

  it("progreso entre Plata y Oro usa el rango correcto", () => {
    const r = calcularNivel(350, NIVELES);
    expect(r.nivelActual?.nombre).toBe("Plata");
    expect(r.progreso).toBeCloseTo(0.5);
    expect(r.puntosParaSiguiente).toBe(150);
  });

  it("nivel máximo: progreso 1 y sin siguiente", () => {
    const r = calcularNivel(800, NIVELES);
    expect(r.nivelActual?.nombre).toBe("Oro");
    expect(r.nivelSiguiente).toBeNull();
    expect(r.progreso).toBe(1);
  });

  it("sin niveles definidos no explota", () => {
    const r = calcularNivel(100, []);
    expect(r.nivelActual).toBeNull();
    expect(r.progreso).toBe(1);
  });
});

describe("calcularNuevaRacha", () => {
  const dia = (iso: string) => new Date(iso);

  it("primera visita arranca la racha en 1", () => {
    expect(calcularNuevaRacha(null, 0, dia("2026-08-01T15:00:00Z"), 14)).toBe(1);
  });

  it("visita dentro de la ventana suma 1", () => {
    expect(
      calcularNuevaRacha(dia("2026-07-25T15:00:00Z"), 3, dia("2026-08-01T15:00:00Z"), 14)
    ).toBe(4);
  });

  it("dos lavados el mismo día no suman doble", () => {
    expect(
      calcularNuevaRacha(dia("2026-08-01T10:00:00Z"), 3, dia("2026-08-01T18:00:00Z"), 14)
    ).toBe(3);
  });

  it("visita fuera de la ventana reinicia en 1", () => {
    expect(
      calcularNuevaRacha(dia("2026-07-01T15:00:00Z"), 5, dia("2026-08-01T15:00:00Z"), 14)
    ).toBe(1);
  });

  it("justo en el límite de la ventana mantiene la racha", () => {
    expect(
      calcularNuevaRacha(dia("2026-07-18T15:00:00Z"), 2, dia("2026-08-01T15:00:00Z"), 14)
    ).toBe(3);
  });
});
