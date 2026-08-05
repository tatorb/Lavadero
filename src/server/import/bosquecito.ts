import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";

import { CATALOGO } from "../../../scripts/import/bosquecito/catalogo";
import { parseRegistro, type Staging } from "../../../scripts/import/bosquecito/parse";
import { calcularNuevaRacha } from "@/lib/gamificacion/niveles";

// Hora por defecto de los lavados históricos (10:00 AR = 13:00 UTC)
const HORA_UTC = 13;

export function resumenStaging(staging: Staging) {
  return {
    lavados: staging.lavados.length,
    clientes: staging.clientes.size,
    autos: staging.autos.size,
    movimientosCaja: staging.caja.length,
    cortesias: staging.lavados.filter((l) => l.esCortesia).length,
    deudas: staging.lavados.filter((l) => l.deuda).length,
    saldosAFavor: staging.lavados.filter((l) => l.saldoAFavor).length,
    filasConRevision: staging.lavados.filter((l) => l.revision.length > 0).length,
    conflictos: staging.conflictos.length,
    controlesConciliacion: staging.controles.length,
    totalCobrado: staging.lavados.reduce((s, l) => s + (l.importeCobrado ?? 0), 0),
    totalGastos: staging.caja.reduce((s, c) => s + c.importe, 0),
  };
}

/** Crea en el lavadero los servicios del catálogo que falten (match por nombre). */
async function asegurarCatalogo(prisma: PrismaClient, lavaderoId: string) {
  const existentes = await prisma.servicio.findMany({ where: { lavaderoId } });
  const porNombre = new Map(existentes.map((s) => [s.nombre.toLowerCase(), s.id]));
  const servicios = new Map<string, { id: string; puntos: number }>();

  for (const [orden, s] of CATALOGO.entries()) {
    let id = porNombre.get(s.nombre.toLowerCase());
    if (!id) {
      const creado = await prisma.servicio.create({
        data: {
          lavaderoId,
          nombre: s.nombre,
          descripcion: s.descripcion,
          precio: s.precio,
          tipo: s.tipo,
          duracionMin: s.duracionMin,
          puntos: s.puntos,
          orden: 100 + orden,
        },
      });
      id = creado.id;
      if (s.precios) {
        await prisma.precioServicio.createMany({
          data: Object.entries(s.precios).map(([tipoVehiculo, precio]) => ({
            servicioId: id!,
            tipoVehiculo: tipoVehiculo as never,
            precio,
          })),
        });
      }
    }
    servicios.set(s.nombre, { id, puntos: s.puntos });
  }
  return servicios;
}

/**
 * Importa el registro histórico de El Bosquecito en el lavadero indicado.
 * Optimizado para serverless: todo se inserta con createMany y la gamificación
 * (puntos, rachas, niveles) se calcula en memoria antes de insertar.
 */
export async function importarRegistroBosquecito(
  prisma: PrismaClient,
  lavaderoId: string
): Promise<{ batchId: string; resumen: ReturnType<typeof resumenStaging> }> {
  const lavadero = await prisma.lavadero.findUniqueOrThrow({
    where: { id: lavaderoId },
    select: { id: true, rachaVentanaDias: true },
  });

  const previo = await prisma.importBatch.findFirst({
    where: { lavaderoId, estado: "APLICADO" },
  });
  if (previo) {
    throw new Error(
      "Este lavadero ya tiene un lote de importación aplicado. Deshacelo primero desde Importaciones."
    );
  }

  const staging = parseRegistro();
  const servicios = await asegurarCatalogo(prisma, lavaderoId);
  const resumen = resumenStaging(staging);

  const batch = await prisma.importBatch.create({
    data: {
      lavaderoId,
      nombre: "Registro histórico El Bosquecito (oct 2025 – ago 2026)",
      resumen: resumen as unknown as Prisma.InputJsonValue,
    },
  });

  // IDs pre-generados para poder usar createMany en todo
  const clienteIds = new Map<string, string>();
  for (const key of staging.clientes.keys()) clienteIds.set(key, randomUUID());
  const autoIds = new Map<string, string>();
  for (const key of staging.autos.keys()) autoIds.set(key, randomUUID());

  // Gamificación en memoria, en orden cronológico
  const estadoCliente = new Map<
    string,
    { puntos: number; racha: number; mejor: number; ultima: Date | null }
  >();
  const lavadosData: Prisma.LavadoCreateManyInput[] = [];
  const addonsData: Prisma.LavadoAddonCreateManyInput[] = [];
  const pagosData: Prisma.PagoCreateManyInput[] = [];
  const puntosData: Prisma.PuntosMovimientoCreateManyInput[] = [];
  const cuentaData: Prisma.MovimientoCuentaCreateManyInput[] = [];

  for (const l of staging.lavados) {
    const lavadoId = randomUUID();
    const llegada = new Date(`${l.fecha}T${String(HORA_UTC).padStart(2, "0")}:00:00Z`);
    const fin = new Date(llegada.getTime() + 45 * 60 * 1000);
    const clienteId = clienteIds.get(l.clienteKey)!;
    const servicio = servicios.get(l.servicioPrincipal)!;

    const puntos =
      servicio.puntos +
      l.addons.reduce((s, a) => s + (servicios.get(a)?.puntos ?? 0), 0);

    const estado = estadoCliente.get(l.clienteKey) ?? {
      puntos: 0,
      racha: 0,
      mejor: 0,
      ultima: null,
    };
    const nuevaRacha = calcularNuevaRacha(
      estado.ultima,
      estado.racha,
      fin,
      lavadero.rachaVentanaDias
    );
    estado.puntos += puntos;
    estado.racha = nuevaRacha;
    estado.mejor = Math.max(estado.mejor, nuevaRacha);
    estado.ultima = fin;
    estadoCliente.set(l.clienteKey, estado);

    const obs = [...l.observaciones, ...l.revision.map((r) => `⚠ ${r}`)];
    lavadosData.push({
      id: lavadoId,
      lavaderoId,
      clienteId,
      autoId: autoIds.get(l.autoKey)!,
      servicioId: servicio.id,
      llegadaAt: llegada,
      inicioAt: llegada,
      finAt: fin,
      entregadoAt: fin,
      detalles: obs.length ? obs.join(". ") : null,
      precioFinal:
        l.importeCobrado != null && l.importeCobrado > 0
          ? l.importeCobrado + (l.deuda ?? 0)
          : l.deuda,
      importeCobrado: l.importeCobrado,
      estadoPago: l.estadoPago,
      formaPago: l.formaPago,
      motivoAjuste: l.esCortesia ? "Cortesía (registro histórico)" : null,
      servicioOriginal: l.servicioOriginal,
      puntosOtorgados: puntos,
      importBatchId: batch.id,
    });

    for (const a of l.addons) {
      const s = servicios.get(a);
      if (s) addonsData.push({ lavadoId, servicioId: s.id, precio: 0 });
    }
    for (const p of l.pagos) {
      pagosData.push({ id: randomUUID(), lavadoId, medio: p.medio, importe: p.importe });
    }
    puntosData.push({
      id: randomUUID(),
      lavaderoId,
      clienteId,
      lavadoId,
      tipo: "LAVADO",
      puntos,
      descripcion: `Lavado: ${l.servicioPrincipal}`,
      createdAt: fin,
    });

    if (l.deuda && l.deuda > 0) {
      cuentaData.push({
        id: randomUUID(),
        lavaderoId,
        clienteId,
        fecha: llegada,
        tipo: "DEUDA",
        importe: l.deuda,
        lavadoId,
        observaciones: "Deuda del registro histórico",
        importBatchId: batch.id,
      });
    }
    if (l.saldoAFavor && l.saldoAFavor > 0) {
      cuentaData.push({
        id: randomUUID(),
        lavaderoId,
        clienteId,
        fecha: llegada,
        tipo: "SALDO_A_FAVOR",
        importe: l.saldoAFavor,
        lavadoId,
        observaciones: "Saldo a favor del registro histórico",
        importBatchId: batch.id,
      });
    }
    if (l.esCortesia) {
      cuentaData.push({
        id: randomUUID(),
        lavaderoId,
        clienteId,
        fecha: llegada,
        tipo: "CORTESIA",
        importe: 0,
        lavadoId,
        observaciones: "Lavado de cortesía (registro histórico)",
        importBatchId: batch.id,
      });
    }
  }

  const clientesData: Prisma.ClienteCreateManyInput[] = [...staging.clientes.values()].map(
    (c) => {
      const estado = estadoCliente.get(c.key);
      return {
        id: clienteIds.get(c.key)!,
        lavaderoId,
        nombre: c.nombre,
        telefono: c.telefono,
        tipoRelacion: c.relacion,
        origen: c.origen,
        nombreOriginal: [...c.nombresOriginales].join(" / "),
        visitasAnotadas: c.visitasAnotadas,
        detalles: c.observaciones.size ? [...c.observaciones].join(". ") : null,
        puntosTotal: estado?.puntos ?? 0,
        rachaActual: estado?.racha ?? 0,
        mejorRacha: estado?.mejor ?? 0,
        ultimaVisita: estado?.ultima ?? null,
        importBatchId: batch.id,
      };
    }
  );

  const autosData: Prisma.AutoCreateManyInput[] = [...staging.autos.values()].map((a) => ({
    id: autoIds.get(a.key)!,
    lavaderoId,
    clienteId: clienteIds.get(a.clienteKey)!,
    marca: a.marca,
    modelo: a.modelo,
    tipo: a.tipo,
    descripcionOriginal: a.descripcionOriginal,
    importBatchId: batch.id,
  }));

  const cajaData: Prisma.MovimientoCajaCreateManyInput[] = staging.caja.map((c) => ({
    id: randomUUID(),
    lavaderoId,
    fecha: new Date(`${c.fecha}T${String(HORA_UTC).padStart(2, "0")}:00:00Z`),
    tipo: c.tipo,
    categoria: c.categoria,
    concepto: c.concepto,
    conceptoOriginal: c.conceptoOriginal,
    importe: c.importe,
    formaPago: c.formaPago,
    importBatchId: batch.id,
  }));

  try {
    await prisma.$transaction([
      prisma.cliente.createMany({ data: clientesData }),
      prisma.auto.createMany({ data: autosData }),
      prisma.lavado.createMany({ data: lavadosData }),
      prisma.lavadoAddon.createMany({ data: addonsData }),
      prisma.pago.createMany({ data: pagosData }),
      prisma.puntosMovimiento.createMany({ data: puntosData }),
      prisma.movimientoCuenta.createMany({ data: cuentaData }),
      prisma.movimientoCaja.createMany({ data: cajaData }),
    ]);
  } catch (e) {
    // La transacción falló: el lote queda marcado como deshecho para no bloquear reintentos
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: { estado: "DESHECHO", deshechoAt: new Date() },
    });
    throw e;
  }

  return { batchId: batch.id, resumen };
}
