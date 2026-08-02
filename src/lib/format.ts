import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";

export const TIMEZONE_DEFAULT = "America/Argentina/Buenos_Aires";

const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function formatARS(valor: number | string | { toNumber(): number }) {
  const n =
    typeof valor === "number"
      ? valor
      : typeof valor === "string"
        ? Number(valor)
        : valor.toNumber();
  return arsFormatter.format(n);
}

/** Formatea una fecha UTC en la zona horaria del lavadero. */
export function formatFecha(
  fecha: Date,
  patron = "dd/MM/yyyy HH:mm",
  timezone = TIMEZONE_DEFAULT
) {
  return format(toZonedTime(fecha, timezone), patron, { locale: es });
}

export function formatDia(fecha: Date, timezone = TIMEZONE_DEFAULT) {
  return formatFecha(fecha, "EEEE d 'de' MMMM", timezone);
}

export function formatHora(fecha: Date, timezone = TIMEZONE_DEFAULT) {
  return formatFecha(fecha, "HH:mm", timezone);
}

/** Convierte minutos desde las 00:00 a "HH:mm" (para las reglas de franja). */
export function minutosAHora(minutos: number) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Convierte "HH:mm" a minutos desde las 00:00. */
export function horaAMinutos(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

export const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;
