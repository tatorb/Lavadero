import { describe, expect, it } from "vitest";

import {
  buscarRegla,
  generarSlotsDia,
  validarTurno,
  type ReglaFranjaInfo,
} from "./reglas";

const TZ = "America/Argentina/Buenos_Aires"; // UTC-3, sin DST

function regla(overrides: Partial<ReglaFranjaInfo>): ReglaFranjaInfo {
  return {
    id: "r1",
    diaSemana: 1,
    horaInicio: 9 * 60,
    horaFin: 18 * 60,
    slotMin: 30,
    capacidadPorSlot: 2,
    confirmacionAuto: true,
    anticipacionMinHoras: null,
    anticipacionMaxDias: null,
    prioridad: 0,
    ...overrides,
  };
}

// 2026-08-03 es lunes; 2026-08-08 es sábado
const lunes10AR = new Date("2026-08-03T13:00:00Z"); // 10:00 AR
const sabado10AR = new Date("2026-08-08T13:00:00Z"); // 10:00 AR

describe("buscarRegla", () => {
  it("matchea por día y rango horario", () => {
    const reglas = [regla({ id: "lun" }), regla({ id: "sab", diaSemana: 6 })];
    expect(buscarRegla(reglas, 1, 600)?.id).toBe("lun");
    expect(buscarRegla(reglas, 6, 600)?.id).toBe("sab");
    expect(buscarRegla(reglas, 0, 600)).toBeNull();
  });

  it("horaFin es exclusiva", () => {
    const reglas = [regla({})];
    expect(buscarRegla(reglas, 1, 18 * 60)).toBeNull();
    expect(buscarRegla(reglas, 1, 18 * 60 - 30)).not.toBeNull();
  });

  it("con solapamiento gana la de mayor prioridad", () => {
    const reglas = [
      regla({ id: "base", prioridad: 0 }),
      regla({ id: "especial", horaInicio: 12 * 60, horaFin: 14 * 60, prioridad: 10 }),
    ];
    expect(buscarRegla(reglas, 1, 12 * 60 + 30)?.id).toBe("especial");
    expect(buscarRegla(reglas, 1, 10 * 60)?.id).toBe("base");
  });
});

describe("validarTurno — casos del negocio", () => {
  it("lunes con confirmación automática: reserva directa válida", () => {
    const reglas = [regla({})];
    const ahora = new Date("2026-08-03T10:00:00Z"); // lunes 07:00 AR
    const r = validarTurno(reglas, lunes10AR, ahora, TZ, 0);
    expect(r.valido).toBe(true);
    expect(r.regla?.confirmacionAuto).toBe(true);
  });

  it("sábado 9-12 con 24h de anticipación mínima: rechaza pedido del mismo día", () => {
    const reglas = [
      regla({
        id: "sab",
        diaSemana: 6,
        horaFin: 12 * 60,
        confirmacionAuto: false,
        anticipacionMinHoras: 24,
      }),
    ];
    // Pedido el sábado a las 08:00 AR para las 10:00 AR (2h de anticipación)
    const mismoDia = validarTurno(reglas, sabado10AR, new Date("2026-08-08T11:00:00Z"), TZ, 0);
    expect(mismoDia.valido).toBe(false);
    expect(mismoDia.motivo).toBe("anticipacion_min");

    // Pedido el jueves: más de 24h → válido y queda pendiente (sin auto-confirmación)
    const conAnticipacion = validarTurno(
      reglas,
      sabado10AR,
      new Date("2026-08-06T13:00:00Z"),
      TZ,
      0
    );
    expect(conAnticipacion.valido).toBe(true);
    expect(conAnticipacion.regla?.confirmacionAuto).toBe(false);
  });

  it("slot lleno rechaza por capacidad", () => {
    const reglas = [regla({ capacidadPorSlot: 2 })];
    const ahora = new Date("2026-08-03T10:00:00Z");
    expect(validarTurno(reglas, lunes10AR, ahora, TZ, 2).motivo).toBe("lleno");
    expect(validarTurno(reglas, lunes10AR, ahora, TZ, 1).valido).toBe(true);
  });

  it("horario sin regla no es reservable", () => {
    const reglas = [regla({})];
    const domingo = new Date("2026-08-09T13:00:00Z");
    const r = validarTurno(reglas, domingo, new Date("2026-08-03T10:00:00Z"), TZ, 0);
    expect(r.motivo).toBe("sin_regla");
  });

  it("rechaza horario desalineado a la grilla", () => {
    const reglas = [regla({})];
    const lunes1015 = new Date("2026-08-03T13:15:00Z"); // 10:15 AR con slots de 30'
    const r = validarTurno(reglas, lunes1015, new Date("2026-08-03T10:00:00Z"), TZ, 0);
    expect(r.motivo).toBe("desalineado");
  });

  it("rechaza fechas pasadas", () => {
    const reglas = [regla({})];
    const r = validarTurno(reglas, lunes10AR, new Date("2026-08-03T14:00:00Z"), TZ, 0);
    expect(r.motivo).toBe("pasado");
  });

  it("anticipación máxima limita reservas lejanas", () => {
    const reglas = [regla({ anticipacionMaxDias: 7 })];
    const enDosSemanas = new Date("2026-08-17T13:00:00Z"); // lunes
    const r = validarTurno(reglas, enDosSemanas, new Date("2026-08-03T10:00:00Z"), TZ, 0);
    expect(r.motivo).toBe("anticipacion_max");
  });
});

describe("generarSlotsDia", () => {
  it("genera la grilla del día con estados", () => {
    const reglas = [
      regla({ diaSemana: 6, horaInicio: 9 * 60, horaFin: 12 * 60, capacidadPorSlot: 3, confirmacionAuto: false, anticipacionMinHoras: 24 }),
    ];
    const ahora = new Date("2026-08-06T13:00:00Z"); // jueves
    const ocupados = new Map<string, number>([
      [new Date("2026-08-08T12:00:00Z").toISOString(), 3], // 09:00 AR lleno
    ]);
    const slots = generarSlotsDia(reglas, "2026-08-08", TZ, ahora, ocupados);

    expect(slots).toHaveLength(6); // 9:00 → 11:30
    expect(slots[0].hora).toBe("09:00");
    expect(slots[0].estado).toBe("lleno");
    expect(slots[1].estado).toBe("disponible");
    expect(slots.at(-1)?.hora).toBe("11:30");
    expect(slots.every((s) => !s.confirmacionAuto)).toBe(true);
  });

  it("día sin reglas → sin slots", () => {
    const reglas = [regla({ diaSemana: 6 })];
    expect(generarSlotsDia(reglas, "2026-08-09", TZ, new Date(), new Map())).toHaveLength(0);
  });

  it("reglas solapadas no duplican slots y gana la prioritaria", () => {
    const reglas = [
      regla({ id: "base", capacidadPorSlot: 2 }),
      regla({
        id: "mediodia",
        horaInicio: 12 * 60,
        horaFin: 14 * 60,
        capacidadPorSlot: 1,
        prioridad: 5,
        confirmacionAuto: false,
      }),
    ];
    const ahora = new Date("2026-08-02T13:00:00Z"); // domingo previo
    const slots = generarSlotsDia(reglas, "2026-08-03", TZ, ahora, new Map());
    const horas = slots.map((s) => s.hora);
    expect(new Set(horas).size).toBe(horas.length); // sin duplicados
    const slot13 = slots.find((s) => s.hora === "13:00");
    expect(slot13?.capacidad).toBe(1);
    expect(slot13?.confirmacionAuto).toBe(false);
  });
});
