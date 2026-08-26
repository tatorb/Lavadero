import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { TIPO_VEHICULO_LABEL } from "@/lib/format";
import {
  calcularDuraciones,
  cortarPor,
  esMedible,
  type LavadoMedido,
} from "@/lib/metricas/duraciones";
import { MetricasDuracion } from "./metricas-duracion";

export const metadata = { title: "Tiempos — Gestión" };

/** Ventana de análisis: lo suficientemente larga para tener muestra. */
const DIAS = 90;

export default async function MetricasPage() {
  const user = await requireStaff();
  // eslint-disable-next-line react-hooks/purity -- la ventana se calcula sobre el momento del pedido
  const desde = new Date(Date.now() - DIAS * 24 * 60 * 60 * 1000);

  const lavados = await prisma.lavado.findMany({
    where: {
      lavaderoId: user.lavaderoId,
      canceladoAt: null,
      finAt: { not: null },
      llegadaAt: { gte: desde },
    },
    select: {
      llegadaAt: true,
      inicioAt: true,
      finAt: true,
      entregadoAt: true,
      tiemposReales: true,
      servicio: { select: { nombre: true } },
      auto: { select: { tipo: true } },
    },
  });

  const items: LavadoMedido[] = lavados.map((l) => ({
    servicio: l.servicio.nombre,
    tipoVehiculo: l.auto.tipo,
    llegadaMs: l.llegadaAt.getTime(),
    inicioMs: l.inicioAt?.getTime() ?? null,
    finMs: l.finAt?.getTime() ?? null,
    entregadoMs: l.entregadoAt?.getTime() ?? null,
    tiemposReales: l.tiemposReales,
  }));

  const medibles = items.filter(esMedible).length;

  return (
    <MetricasDuracion
      dias={DIAS}
      general={calcularDuraciones(items)}
      porServicio={cortarPor(items, (l) => l.servicio)}
      porVehiculo={cortarPor(items, (l) => TIPO_VEHICULO_LABEL[l.tipoVehiculo] ?? l.tipoVehiculo)}
      excluidos={items.length - medibles}
    />
  );
}
