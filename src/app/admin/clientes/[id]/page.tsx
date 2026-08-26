import { notFound } from "next/navigation";

import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { calcularSaldo } from "@/lib/cuentas";
import { descripcionAuto } from "@/lib/format";
import { calcularNivel } from "@/lib/gamificacion/niveles";
import { ClienteDetalle } from "./cliente-detalle";

export const metadata = { title: "Cliente — Gestión" };

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireStaff();

  const cliente = await prisma.cliente.findFirst({
    where: { id, lavaderoId: user.lavaderoId },
    include: {
      autos: { orderBy: { createdAt: "asc" } },
      vinculadoCon: { select: { id: true, nombre: true, apellido: true } },
      lavados: {
        include: { servicio: true, auto: true },
        orderBy: { llegadaAt: "desc" },
        take: 200,
      },
      turnos: {
        include: { servicio: true, auto: true },
        orderBy: { fechaTurno: "desc" },
        take: 50,
      },
      movimientosCuenta: { orderBy: { fecha: "desc" }, take: 100 },
    },
  });
  if (!cliente) notFound();

  const [niveles, candidatos, lavadero] = await Promise.all([
    prisma.nivel.findMany({
      where: { lavaderoId: user.lavaderoId, activo: true },
      orderBy: { puntosMin: "asc" },
    }),
    prisma.cliente.findMany({
      where: {
        lavaderoId: user.lavaderoId,
        id: { not: cliente.id },
        vinculadoConId: null,
        activo: true,
      },
      select: { id: true, nombre: true, apellido: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.lavadero.findUnique({
      where: { id: user.lavaderoId },
      select: { timezone: true },
    }),
  ]);

  const estadoNivel = calcularNivel(cliente.puntosTotal, niveles);

  const totalGastado = cliente.lavados.reduce(
    (s, l) => s + (l.importeCobrado?.toNumber() ?? 0),
    0
  );
  const primeraVisita = cliente.lavados.at(-1)?.llegadaAt ?? null;
  const lavadosPorAuto = new Map<string, number>();
  for (const l of cliente.lavados) {
    lavadosPorAuto.set(l.autoId, (lavadosPorAuto.get(l.autoId) ?? 0) + 1);
  }

  // Hábitos: lo que se deduce del historial sin que nadie lo cargue a mano
  const porServicio = new Map<string, number>();
  for (const l of cliente.lavados) {
    porServicio.set(l.servicio.nombre, (porServicio.get(l.servicio.nombre) ?? 0) + 1);
  }
  const favorito = [...porServicio.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  const cobrados = cliente.lavados.filter((l) => (l.importeCobrado?.toNumber() ?? 0) > 0);
  const gastoPromedio = cobrados.length
    ? Math.round(totalGastado / cobrados.length)
    : null;

  // Los lavados vienen del más nuevo al más viejo
  const ultimaVisita = cliente.lavados.at(0)?.llegadaAt ?? null;
  const cadaCuantosDias =
    cliente.lavados.length > 1 && primeraVisita && ultimaVisita
      ? Math.round(
          (ultimaVisita.getTime() - primeraVisita.getTime()) /
            (1000 * 60 * 60 * 24 * (cliente.lavados.length - 1))
        )
      : null;

  return (
    <ClienteDetalle
      cliente={{
        id: cliente.id,
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        telefono: cliente.telefono,
        email: cliente.email,
        tipoRelacion: cliente.tipoRelacion,
        origen: cliente.origen,
        activo: cliente.activo,
        vinculoTipo: cliente.vinculoTipo,
        nombreOriginal: cliente.nombreOriginal,
        visitasAnotadas: cliente.visitasAnotadas,
        detalles: cliente.detalles,
        perfil: cliente.perfil,
        queValora: cliente.queValora,
        preferencias: cliente.preferencias,
        conCuenta: !!cliente.passwordHash,
        puntosTotal: cliente.puntosTotal,
        rachaActual: cliente.rachaActual,
        mejorRacha: cliente.mejorRacha,
        ultimaVisita: cliente.ultimaVisita?.toISOString() ?? null,
        vinculadoCon: cliente.vinculadoCon
          ? {
              id: cliente.vinculadoCon.id,
              nombre: [cliente.vinculadoCon.nombre, cliente.vinculadoCon.apellido]
                .filter(Boolean)
                .join(" "),
            }
          : null,
      }}
      timezone={lavadero?.timezone ?? "America/Argentina/Buenos_Aires"}
      habitos={{
        servicioFavorito: favorito?.[0] ?? null,
        vecesServicioFavorito: favorito?.[1] ?? 0,
        gastoPromedio,
        cadaCuantosDias,
        primeraVisitaISO: primeraVisita?.toISOString() ?? null,
        ultimaVisitaISO: ultimaVisita?.toISOString() ?? null,
      }}
      autos={cliente.autos.map((a) => ({
        id: a.id,
        marca: a.marca,
        modelo: a.modelo,
        patente: a.patente,
        tipo: a.tipo,
        color: a.color,
        detalles: a.detalles,
        descripcionOriginal: a.descripcionOriginal,
        cantidadLavados: lavadosPorAuto.get(a.id) ?? 0,
      }))}
      lavados={cliente.lavados.map((l) => ({
        id: l.id,
        fecha: l.llegadaAt.toISOString(),
        servicio: l.servicio.nombre,
        auto: descripcionAuto(l.auto),
        autoId: l.autoId,
        finalizado: !!l.finAt,
        cancelado: !!l.canceladoAt,
        puntos: l.puntosOtorgados,
        precio: l.precioFinal?.toNumber() ?? null,
        cobrado: l.importeCobrado?.toNumber() ?? null,
        estadoPago: l.estadoPago,
      }))}
      resumen={{
        totalLavados: cliente.lavados.length,
        totalGastado,
        primeraVisita: primeraVisita?.toISOString() ?? null,
      }}
      turnos={cliente.turnos.map((t) => ({
        id: t.id,
        fecha: t.fechaTurno.toISOString(),
        servicio: t.servicio.nombre,
        auto: t.auto ? `${t.auto.marca} ${t.auto.modelo}` : null,
        estado: t.estado,
      }))}
      nivel={{
        actual: estadoNivel.nivelActual?.nombre ?? "—",
        color: estadoNivel.nivelActual?.color ?? null,
        siguiente: estadoNivel.nivelSiguiente?.nombre ?? null,
        progreso: estadoNivel.progreso,
        puntosParaSiguiente: estadoNivel.puntosParaSiguiente,
      }}
      candidatosVinculo={candidatos.map((c) => ({
        id: c.id,
        nombre: [c.nombre, c.apellido].filter(Boolean).join(" "),
      }))}
      cuenta={{
        saldo: calcularSaldo(cliente.movimientosCuenta),
        movimientos: cliente.movimientosCuenta.map((m) => ({
          id: m.id,
          fecha: m.fecha.toISOString(),
          tipo: m.tipo,
          importe: m.importe.toNumber(),
          observaciones: m.observaciones,
          lavadoId: m.lavadoId,
        })),
        esAdmin: user.rol === "ADMIN",
      }}
    />
  );
}
