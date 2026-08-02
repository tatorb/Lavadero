import { fromZonedTime, toZonedTime } from "date-fns-tz";

/**
 * Motor puro de reglas de turnos por franja horaria.
 *
 * Las reglas definen la disponibilidad: si ninguna regla matchea un horario,
 * ese horario no es reservable por el cliente (así se modela también el
 * horario de atención). El staff puede crear turnos por fuera de las reglas.
 */

export interface ReglaFranjaInfo {
  id: string;
  diaSemana: number; // 0=domingo … 6=sábado
  horaInicio: number; // minutos desde las 00:00 en TZ del lavadero
  horaFin: number; // exclusivo
  slotMin: number;
  capacidadPorSlot: number;
  confirmacionAuto: boolean;
  anticipacionMinHoras: number | null;
  anticipacionMaxDias: number | null;
  prioridad: number;
}

export type MotivoRechazo =
  | "sin_regla"
  | "desalineado"
  | "pasado"
  | "anticipacion_min"
  | "anticipacion_max"
  | "lleno";

export interface ResultadoValidacion {
  valido: boolean;
  motivo?: MotivoRechazo;
  regla?: ReglaFranjaInfo;
}

/** Día de semana y minuto del día de una fecha UTC, vistos en la TZ dada. */
export function partesEnTz(fecha: Date, timezone: string) {
  const zoned = toZonedTime(fecha, timezone);
  return {
    diaSemana: zoned.getDay(),
    minutoDia: zoned.getHours() * 60 + zoned.getMinutes(),
    fechaLocal: zoned,
  };
}

/** Regla que aplica a un (día, minuto); si varias solapan gana la de mayor prioridad. */
export function buscarRegla(
  reglas: ReglaFranjaInfo[],
  diaSemana: number,
  minutoDia: number
): ReglaFranjaInfo | null {
  const candidatas = reglas.filter(
    (r) =>
      r.diaSemana === diaSemana && r.horaInicio <= minutoDia && minutoDia < r.horaFin
  );
  if (candidatas.length === 0) return null;
  return candidatas.sort((a, b) => b.prioridad - a.prioridad)[0];
}

/**
 * Valida un pedido de turno del cliente para `fechaTurno` (UTC).
 * `ocupados` es la cantidad de turnos PENDIENTE/CONFIRMADO ya tomados en ese slot.
 */
export function validarTurno(
  reglas: ReglaFranjaInfo[],
  fechaTurno: Date,
  ahora: Date,
  timezone: string,
  ocupados: number
): ResultadoValidacion {
  if (fechaTurno.getTime() <= ahora.getTime()) {
    return { valido: false, motivo: "pasado" };
  }

  const { diaSemana, minutoDia } = partesEnTz(fechaTurno, timezone);
  const regla = buscarRegla(reglas, diaSemana, minutoDia);
  if (!regla) return { valido: false, motivo: "sin_regla" };

  if ((minutoDia - regla.horaInicio) % regla.slotMin !== 0) {
    return { valido: false, motivo: "desalineado", regla };
  }

  const horasDeAnticipacion = (fechaTurno.getTime() - ahora.getTime()) / (1000 * 60 * 60);
  if (regla.anticipacionMinHoras != null && horasDeAnticipacion < regla.anticipacionMinHoras) {
    return { valido: false, motivo: "anticipacion_min", regla };
  }
  if (
    regla.anticipacionMaxDias != null &&
    horasDeAnticipacion > regla.anticipacionMaxDias * 24
  ) {
    return { valido: false, motivo: "anticipacion_max", regla };
  }

  if (ocupados >= regla.capacidadPorSlot) {
    return { valido: false, motivo: "lleno", regla };
  }

  return { valido: true, regla };
}

export type EstadoSlot = "disponible" | "lleno" | "fuera_de_anticipacion" | "pasado";

export interface SlotDisponibilidad {
  /** Inicio del slot en UTC */
  fecha: Date;
  /** "HH:mm" en la TZ del lavadero */
  hora: string;
  estado: EstadoSlot;
  confirmacionAuto: boolean;
  capacidad: number;
  ocupados: number;
}

/**
 * Genera los slots de un día calendario (en la TZ del lavadero) a partir de
 * las reglas. `dia` es "yyyy-MM-dd" local del lavadero. `ocupadosPorSlot`
 * mapea ISO UTC del inicio del slot → cantidad de turnos tomados.
 */
export function generarSlotsDia(
  reglas: ReglaFranjaInfo[],
  dia: string,
  timezone: string,
  ahora: Date,
  ocupadosPorSlot: Map<string, number>
): SlotDisponibilidad[] {
  // Día de semana del día pedido, en la TZ del lavadero
  const mediodia = fromZonedTime(`${dia}T12:00:00`, timezone);
  const { diaSemana } = partesEnTz(mediodia, timezone);

  const slots: SlotDisponibilidad[] = [];
  const vistos = new Set<number>();

  for (const regla of reglas) {
    if (regla.diaSemana !== diaSemana) continue;
    for (let m = regla.horaInicio; m < regla.horaFin; m += regla.slotMin) {
      // Si dos reglas solapan, el slot pertenece a la regla ganadora en ese minuto
      const ganadora = buscarRegla(reglas, diaSemana, m);
      if (ganadora?.id !== regla.id) continue;
      if (vistos.has(m)) continue;
      vistos.add(m);

      const hh = String(Math.floor(m / 60)).padStart(2, "0");
      const mm = String(m % 60).padStart(2, "0");
      const fecha = fromZonedTime(`${dia}T${hh}:${mm}:00`, timezone);
      const ocupados = ocupadosPorSlot.get(fecha.toISOString()) ?? 0;

      const validacion = validarTurno(reglas, fecha, ahora, timezone, ocupados);
      let estado: EstadoSlot = "disponible";
      if (!validacion.valido) {
        estado =
          validacion.motivo === "lleno"
            ? "lleno"
            : validacion.motivo === "pasado"
              ? "pasado"
              : "fuera_de_anticipacion";
      }

      slots.push({
        fecha,
        hora: `${hh}:${mm}`,
        estado,
        confirmacionAuto: regla.confirmacionAuto,
        capacidad: regla.capacidadPorSlot,
        ocupados,
      });
    }
  }

  return slots.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}
