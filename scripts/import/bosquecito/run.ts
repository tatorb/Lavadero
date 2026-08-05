/**
 * Importador del registro histórico de El Bosquecito.
 *
 *   npx tsx scripts/import/bosquecito/run.ts --preview        vista previa (no toca la base)
 *   npx tsx scripts/import/bosquecito/run.ts --apply          importa todo en un lote
 *   npx tsx scripts/import/bosquecito/run.ts --undo <batchId> deshace un lote completo
 *
 * Contra Neon: anteponer DATABASE_URL="..." DIRECT_URL="..." al comando.
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

import { NIVELES_DEFAULT } from "../../../src/lib/gamificacion/niveles";
import { otorgarPuntosLavado } from "../../../src/lib/gamificacion/puntos";
import { CATALOGO } from "./catalogo";
import { parseRegistro, type Staging } from "./parse";

const prisma = new PrismaClient();

const SLUG = "el-bosquecito";
// Hora por defecto de los lavados históricos (10:00 AR = 13:00 UTC): el registro no tiene hora
const HORA_UTC = 13;

function resumen(staging: Staging) {
  const cortesias = staging.lavados.filter((l) => l.esCortesia).length;
  const conDeuda = staging.lavados.filter((l) => l.deuda).length;
  const conSaldo = staging.lavados.filter((l) => l.saldoAFavor).length;
  const conRevision = staging.lavados.filter((l) => l.revision.length > 0);
  const totalCobrado = staging.lavados.reduce((s, l) => s + (l.importeCobrado ?? 0), 0);
  const totalGastos = staging.caja.reduce((s, c) => s + c.importe, 0);

  return {
    lavados: staging.lavados.length,
    clientes: staging.clientes.size,
    autos: staging.autos.size,
    movimientosCaja: staging.caja.length,
    cortesias,
    deudas: conDeuda,
    saldosAFavor: conSaldo,
    filasConRevision: conRevision.length,
    conflictos: staging.conflictos.length,
    controlesConciliacion: staging.controles.length,
    totalCobrado,
    totalGastos,
  };
}

function imprimirPreview(staging: Staging) {
  const r = resumen(staging);
  console.log("\n=== VISTA PREVIA DE LA IMPORTACIÓN — EL BOSQUECITO ===\n");
  console.log(`Lavados:               ${r.lavados}`);
  console.log(`Clientes únicos:       ${r.clientes}`);
  console.log(`Vehículos:             ${r.autos}`);
  console.log(`Movimientos de caja:   ${r.movimientosCaja} (gastos $${r.totalGastos.toLocaleString("es-AR")})`);
  console.log(`Total cobrado:         $${r.totalCobrado.toLocaleString("es-AR")}`);
  console.log(`Cortesías/gratis:      ${r.cortesias}`);
  console.log(`Lavados con deuda:     ${r.deudas}`);
  console.log(`Saldos a favor:        ${r.saldosAFavor}`);
  console.log(`Filas a revisar:       ${r.filasConRevision}`);
  console.log(`Líneas en conflicto:   ${r.conflictos}`);
  console.log(`Controles (subtotales):${r.controlesConciliacion}`);

  console.log("\n--- Clientes más frecuentes ---");
  const porCliente = new Map<string, number>();
  for (const l of staging.lavados) {
    porCliente.set(l.clienteKey, (porCliente.get(l.clienteKey) ?? 0) + 1);
  }
  [...porCliente.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([key, n]) => {
      const c = staging.clientes.get(key)!;
      console.log(`  ${c.nombre}: ${n} lavados (anotado: ${c.visitasAnotadas ?? "—"})`);
    });

  if (staging.conflictos.length) {
    console.log("\n--- Líneas en conflicto (no se importan como lavados) ---");
    for (const c of staging.conflictos) {
      console.log(`  L${c.linea} [${c.motivo}]: ${c.texto.slice(0, 90)}`);
    }
  }

  console.log("\n--- Filas que se importan marcadas 'requiere revisión' ---");
  staging.lavados
    .filter((l) => l.revision.length > 0)
    .slice(0, 20)
    .forEach((l) => console.log(`  L${l.linea} ${l.fecha}: ${l.revision.join("; ")}`));

  const salida = path.join(__dirname, "preview.json");
  fs.writeFileSync(
    salida,
    JSON.stringify(
      {
        resumen: r,
        conflictos: staging.conflictos,
        filasConRevision: staging.lavados.filter((l) => l.revision.length > 0),
        clientes: [...staging.clientes.values()].map((c) => ({
          ...c,
          nombresOriginales: [...c.nombresOriginales],
          observaciones: [...c.observaciones],
        })),
      },
      null,
      2
    )
  );
  console.log(`\nDetalle completo en ${salida}\n`);
}

async function asegurarLavadero() {
  let lavadero = await prisma.lavadero.findUnique({ where: { slug: SLUG } });
  if (!lavadero) {
    lavadero = await prisma.lavadero.create({
      data: {
        nombre: "El Bosquecito Car Wash & Detail",
        slug: SLUG,
        direccion: "Ruta C-45 km 19, Villa Camiares, Alta Gracia (ingreso por la gomería)",
        telefono: "+54 351 214 1148",
        niveles: { create: NIVELES_DEFAULT },
      },
    });
    console.log("Lavadero El Bosquecito creado.");
  }

  const admin = await prisma.usuario.findUnique({
    where: { email: "admin@elbosquecito.com" },
  });
  if (!admin) {
    await prisma.usuario.create({
      data: {
        email: "admin@elbosquecito.com",
        passwordHash: await bcrypt.hash("bosquecito2026", 10),
        nombre: "Admin El Bosquecito",
        rol: "ADMIN",
        lavaderoId: lavadero.id,
      },
    });
    console.log("Usuario admin@elbosquecito.com creado (contraseña: bosquecito2026).");
  }

  // Catálogo de servicios con precios por tipo (idempotente por nombre)
  const servicios = new Map<string, string>();
  for (const [orden, s] of CATALOGO.entries()) {
    let servicio = await prisma.servicio.findFirst({
      where: { lavaderoId: lavadero.id, nombre: s.nombre },
    });
    if (!servicio) {
      servicio = await prisma.servicio.create({
        data: {
          lavaderoId: lavadero.id,
          nombre: s.nombre,
          descripcion: s.descripcion,
          precio: s.precio,
          tipo: s.tipo,
          duracionMin: s.duracionMin,
          puntos: s.puntos,
          orden,
        },
      });
      if (s.precios) {
        await prisma.precioServicio.createMany({
          data: Object.entries(s.precios).map(([tipoVehiculo, precio]) => ({
            servicioId: servicio!.id,
            tipoVehiculo: tipoVehiculo as never,
            precio,
          })),
        });
      }
    }
    servicios.set(s.nombre, servicio.id);
  }
  return { lavadero, servicios };
}

async function aplicar(staging: Staging) {
  const { lavadero, servicios } = await asegurarLavadero();

  const yaImportado = await prisma.importBatch.findFirst({
    where: { lavaderoId: lavadero.id, estado: "APLICADO" },
  });
  if (yaImportado) {
    console.error(
      `Ya existe un lote aplicado (${yaImportado.id}). Deshacelo primero con --undo si querés re-importar.`
    );
    process.exit(1);
  }

  const batch = await prisma.importBatch.create({
    data: {
      lavaderoId: lavadero.id,
      nombre: "Registro histórico El Bosquecito (oct 2025 – ago 2026)",
      resumen: resumen(staging) as unknown as Prisma.InputJsonValue,
    },
  });
  console.log(`Lote de importación: ${batch.id}`);

  // Clientes
  const clienteIds = new Map<string, string>();
  for (const c of staging.clientes.values()) {
    const cliente = await prisma.cliente.create({
      data: {
        lavaderoId: lavadero.id,
        nombre: c.nombre,
        telefono: c.telefono,
        tipoRelacion: c.relacion,
        origen: c.origen,
        nombreOriginal: [...c.nombresOriginales].join(" / "),
        visitasAnotadas: c.visitasAnotadas,
        detalles: c.observaciones.size ? [...c.observaciones].join(". ") : null,
        importBatchId: batch.id,
      },
    });
    clienteIds.set(c.key, cliente.id);
  }
  console.log(`Clientes: ${clienteIds.size}`);

  // Autos
  const autoIds = new Map<string, string>();
  for (const a of staging.autos.values()) {
    const auto = await prisma.auto.create({
      data: {
        lavaderoId: lavadero.id,
        clienteId: clienteIds.get(a.clienteKey)!,
        marca: a.marca,
        modelo: a.modelo,
        tipo: a.tipo,
        descripcionOriginal: a.descripcionOriginal,
        importBatchId: batch.id,
      },
    });
    autoIds.set(a.key, auto.id);
  }
  console.log(`Autos: ${autoIds.size}`);

  // Lavados en orden cronológico (la gamificación necesita el orden real)
  let procesados = 0;
  for (const l of staging.lavados) {
    const llegada = new Date(`${l.fecha}T${String(HORA_UTC).padStart(2, "0")}:00:00Z`);
    const fin = new Date(llegada.getTime() + 45 * 60 * 1000);
    const servicioId = servicios.get(l.servicioPrincipal)!;
    const obs = [...l.observaciones, ...l.revision.map((r) => `⚠ ${r}`)];

    await prisma.$transaction(async (tx) => {
      const lavado = await tx.lavado.create({
        data: {
          lavaderoId: lavadero.id,
          clienteId: clienteIds.get(l.clienteKey)!,
          autoId: autoIds.get(l.autoKey)!,
          servicioId,
          llegadaAt: llegada,
          inicioAt: llegada,
          entregadoAt: fin,
          detalles: obs.length ? obs.join(". ") : null,
          precioFinal: l.importeCobrado != null && l.importeCobrado > 0 ? l.importeCobrado + (l.deuda ?? 0) : l.deuda,
          importeCobrado: l.importeCobrado,
          estadoPago: l.estadoPago,
          formaPago: l.formaPago,
          motivoAjuste: l.esCortesia ? "Cortesía (registro histórico)" : null,
          servicioOriginal: l.servicioOriginal,
          importBatchId: batch.id,
          addons: {
            create: l.addons
              .filter((a) => servicios.has(a))
              .map((a) => ({ servicioId: servicios.get(a)!, precio: 0 })),
          },
          pagos: { create: l.pagos.map((p) => ({ medio: p.medio, importe: p.importe })) },
        },
      });

      // Gamificación retroactiva (marca finAt)
      await otorgarPuntosLavado(tx, lavado.id, fin);

      if (l.deuda && l.deuda > 0) {
        await tx.movimientoCuenta.create({
          data: {
            lavaderoId: lavadero.id,
            clienteId: clienteIds.get(l.clienteKey)!,
            fecha: llegada,
            tipo: "DEUDA",
            importe: l.deuda,
            lavadoId: lavado.id,
            observaciones: "Deuda del registro histórico",
            importBatchId: batch.id,
          },
        });
      }
      if (l.saldoAFavor && l.saldoAFavor > 0) {
        await tx.movimientoCuenta.create({
          data: {
            lavaderoId: lavadero.id,
            clienteId: clienteIds.get(l.clienteKey)!,
            fecha: llegada,
            tipo: "SALDO_A_FAVOR",
            importe: l.saldoAFavor,
            lavadoId: lavado.id,
            observaciones: "Saldo a favor del registro histórico",
            importBatchId: batch.id,
          },
        });
      }
      if (l.esCortesia) {
        await tx.movimientoCuenta.create({
          data: {
            lavaderoId: lavadero.id,
            clienteId: clienteIds.get(l.clienteKey)!,
            fecha: llegada,
            tipo: "CORTESIA",
            importe: 0,
            lavadoId: lavado.id,
            observaciones: "Lavado de cortesía (registro histórico)",
            importBatchId: batch.id,
          },
        });
      }
    });

    procesados++;
    if (procesados % 100 === 0) console.log(`Lavados: ${procesados}/${staging.lavados.length}`);
  }
  console.log(`Lavados: ${procesados}`);

  // Caja
  for (const c of staging.caja) {
    await prisma.movimientoCaja.create({
      data: {
        lavaderoId: lavadero.id,
        fecha: new Date(`${c.fecha}T${String(HORA_UTC).padStart(2, "0")}:00:00Z`),
        tipo: c.tipo,
        categoria: c.categoria,
        concepto: c.concepto,
        conceptoOriginal: c.conceptoOriginal,
        importe: c.importe,
        formaPago: c.formaPago,
        importBatchId: batch.id,
      },
    });
  }
  console.log(`Movimientos de caja: ${staging.caja.length}`);

  console.log(`\nImportación aplicada. Lote: ${batch.id}`);
  console.log("Para deshacer: npx tsx scripts/import/bosquecito/run.ts --undo", batch.id);
}

async function deshacer(batchId: string) {
  const batch = await prisma.importBatch.findUnique({ where: { id: batchId } });
  if (!batch || batch.estado === "DESHECHO") {
    console.error("Lote no encontrado o ya deshecho.");
    process.exit(1);
  }

  const clientes = await prisma.cliente.findMany({
    where: { importBatchId: batchId },
    select: { id: true },
  });
  const clienteIds = clientes.map((c) => c.id);

  await prisma.$transaction([
    prisma.puntosMovimiento.deleteMany({ where: { clienteId: { in: clienteIds } } }),
    prisma.movimientoCuenta.deleteMany({ where: { importBatchId: batchId } }),
    prisma.movimientoCaja.deleteMany({ where: { importBatchId: batchId } }),
    prisma.lavado.deleteMany({ where: { importBatchId: batchId } }),
    prisma.auto.deleteMany({ where: { importBatchId: batchId } }),
    prisma.cliente.deleteMany({ where: { id: { in: clienteIds } } }),
    prisma.importBatch.update({
      where: { id: batchId },
      data: { estado: "DESHECHO", deshechoAt: new Date() },
    }),
  ]);
  console.log(`Lote ${batchId} deshecho: se eliminaron ${clienteIds.length} clientes y todos sus datos.`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--preview")) {
    imprimirPreview(parseRegistro());
  } else if (args.includes("--apply")) {
    const staging = parseRegistro();
    imprimirPreview(staging);
    await aplicar(staging);
  } else if (args.includes("--undo")) {
    const id = args[args.indexOf("--undo") + 1];
    if (!id) {
      console.error("Falta el id del lote: --undo <batchId>");
      process.exit(1);
    }
    await deshacer(id);
  } else {
    console.log("Uso: run.ts --preview | --apply | --undo <batchId>");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
