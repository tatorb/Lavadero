/**
 * Importador del registro histórico de El Bosquecito (CLI).
 *
 *   npx tsx scripts/import/bosquecito/run.ts --preview        vista previa (no toca la base)
 *   npx tsx scripts/import/bosquecito/run.ts --apply          importa todo en un lote
 *   npx tsx scripts/import/bosquecito/run.ts --undo <batchId> deshace un lote completo
 *
 * Contra Neon: anteponer DATABASE_URL="..." DIRECT_URL="..." al comando.
 * La importación también puede ejecutarse desde la app: Gestión → Importaciones.
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { NIVELES_DEFAULT } from "../../../src/lib/gamificacion/niveles";
import {
  importarRegistroBosquecito,
  resumenStaging,
} from "../../../src/server/import/bosquecito";
import { parseRegistro, type Staging } from "./parse";

const prisma = new PrismaClient();

const SLUG = "el-bosquecito";

function imprimirPreview(staging: Staging) {
  const r = resumenStaging(staging);
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

/** Crea el lavadero El Bosquecito y su admin si no existen (solo CLI). */
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
  return lavadero;
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
    prisma.turno.deleteMany({ where: { clienteId: { in: clienteIds } } }),
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
    imprimirPreview(parseRegistro());
    const lavadero = await asegurarLavadero();
    const { batchId } = await importarRegistroBosquecito(prisma, lavadero.id);
    console.log(`\nImportación aplicada. Lote: ${batchId}`);
    console.log("Para deshacer: npx tsx scripts/import/bosquecito/run.ts --undo", batchId);
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
