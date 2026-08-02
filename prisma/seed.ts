import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { NIVELES_DEFAULT } from "../src/lib/gamificacion/niveles";
import { otorgarPuntosLavado } from "../src/lib/gamificacion/puntos";

const prisma = new PrismaClient();

// Los horarios se definen en la TZ del lavadero (America/Argentina/Buenos_Aires, UTC-3).
const OFFSET_AR_HORAS = 3;

/** Devuelve la fecha UTC correspondiente a `hora:minuto` hora argentina de un día dado. */
function fechaAR(base: Date, hora: number, minuto = 0): Date {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  d.setUTCHours(hora + OFFSET_AR_HORAS, minuto, 0, 0);
  return d;
}

function diasDesdeHoy(dias: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dias);
  return d;
}

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const lavadero = await prisma.lavadero.upsert({
    where: { slug: "lavadero-demo" },
    update: {},
    create: {
      nombre: "Lavadero Demo",
      slug: "lavadero-demo",
      direccion: "Av. Siempreviva 742, Buenos Aires",
      telefono: "+54 11 5555-0000",
    },
  });

  // ===== Niveles =====
  for (const nivel of NIVELES_DEFAULT) {
    await prisma.nivel.upsert({
      where: { lavaderoId_orden: { lavaderoId: lavadero.id, orden: nivel.orden } },
      update: {},
      create: { ...nivel, lavaderoId: lavadero.id },
    });
  }
  const niveles = await prisma.nivel.findMany({ where: { lavaderoId: lavadero.id } });
  const nivelPlata = niveles.find((n) => n.nombre === "Plata")!;
  const nivelOro = niveles.find((n) => n.nombre === "Oro")!;

  // ===== Staff =====
  await prisma.usuario.upsert({
    where: { email: "super@demo.com" },
    update: {},
    create: { email: "super@demo.com", passwordHash, nombre: "Súper Admin", rol: "SUPER_ADMIN" },
  });
  await prisma.usuario.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      email: "admin@demo.com",
      passwordHash,
      nombre: "Ana Admin",
      rol: "ADMIN",
      lavaderoId: lavadero.id,
    },
  });
  await prisma.usuario.upsert({
    where: { email: "operativo@demo.com" },
    update: {},
    create: {
      email: "operativo@demo.com",
      passwordHash,
      nombre: "Oscar Operativo",
      rol: "OPERATIVO",
      lavaderoId: lavadero.id,
    },
  });

  // ===== Servicios =====
  const serviciosData = [
    { nombre: "Lavado básico", descripcion: "Exterior + aspirado", precio: 8000, tipo: "PRINCIPAL", duracionMin: 30, puntos: 10, orden: 1 },
    { nombre: "Lavado avanzado", descripcion: "Exterior, interior y llantas", precio: 15000, tipo: "PRINCIPAL", duracionMin: 60, puntos: 20, orden: 2 },
    { nombre: "Lavado premium", descripcion: "Detallado completo", precio: 25000, tipo: "PRINCIPAL", duracionMin: 90, puntos: 35, orden: 3 },
    { nombre: "Encerado", descripcion: "Cera protectora", precio: 6000, tipo: "ADDON", duracionMin: 20, puntos: 8, orden: 10 },
    { nombre: "Lavado de chasis", descripcion: "Limpieza inferior a presión", precio: 7000, tipo: "ADDON", duracionMin: 20, puntos: 8, orden: 11 },
    { nombre: "Lavado de motor", descripcion: "Desengrase de motor", precio: 9000, tipo: "ADDON", duracionMin: 30, puntos: 10, orden: 12 },
  ] as const;

  const servicios: Record<string, { id: string; precio: number; duracionMin: number }> = {};
  for (const s of serviciosData) {
    const existente = await prisma.servicio.findFirst({
      where: { lavaderoId: lavadero.id, nombre: s.nombre },
    });
    const servicio =
      existente ??
      (await prisma.servicio.create({ data: { ...s, lavaderoId: lavadero.id } }));
    servicios[s.nombre] = { id: servicio.id, precio: s.precio, duracionMin: s.duracionMin };
  }

  // ===== Reglas de franja =====
  // Lunes a viernes 9–18: auto-confirmado, 2 por slot de 30'
  // Sábado 9–12: confirmación manual, anticipación mínima 24h, 3 por slot
  if ((await prisma.reglaFranja.count({ where: { lavaderoId: lavadero.id } })) === 0) {
    for (let dia = 1; dia <= 5; dia++) {
      await prisma.reglaFranja.create({
        data: {
          lavaderoId: lavadero.id,
          diaSemana: dia,
          horaInicio: 9 * 60,
          horaFin: 18 * 60,
          slotMin: 30,
          capacidadPorSlot: 2,
          confirmacionAuto: true,
        },
      });
    }
    await prisma.reglaFranja.create({
      data: {
        lavaderoId: lavadero.id,
        diaSemana: 6,
        horaInicio: 9 * 60,
        horaFin: 12 * 60,
        slotMin: 30,
        capacidadPorSlot: 3,
        confirmacionAuto: false,
        anticipacionMinHoras: 24,
      },
    });
  }

  // ===== Clientes y autos =====
  if ((await prisma.cliente.count({ where: { lavaderoId: lavadero.id } })) > 0) {
    console.log("Seed ya aplicado (hay clientes). Nada que hacer.");
    return;
  }

  const clientesData: Array<{
    nombre: string;
    apellido: string;
    telefono: string;
    email?: string;
    conCuenta?: boolean;
    autos: Array<{ marca: string; modelo: string; patente: string; color?: string }>;
  }> = [
    {
      nombre: "Carla", apellido: "Gómez", telefono: "+54 11 6000-0001", email: "cliente@demo.com", conCuenta: true,
      autos: [
        { marca: "Toyota", modelo: "Corolla", patente: "AB123CD", color: "Gris" },
        { marca: "Fiat", modelo: "Cronos", patente: "AC456EF", color: "Blanco" },
      ],
    },
    {
      nombre: "Diego", apellido: "Gómez", telefono: "+54 11 6000-0002", email: "diego@demo.com",
      autos: [{ marca: "Volkswagen", modelo: "Amarok", patente: "AD789GH", color: "Negro" }],
    },
    {
      nombre: "María", apellido: "Pérez", telefono: "+54 11 6000-0003", email: "maria@demo.com",
      autos: [
        { marca: "Peugeot", modelo: "208", patente: "AE111JK", color: "Rojo" },
        { marca: "Renault", modelo: "Duster", patente: "AF222LM" },
      ],
    },
    {
      nombre: "Jorge", apellido: "Suárez", telefono: "+54 11 6000-0004",
      autos: [{ marca: "Ford", modelo: "Ranger", patente: "AG333NP", color: "Azul" }],
    },
    {
      nombre: "Lucía", apellido: "Fernández", telefono: "+54 11 6000-0005", email: "lucia@demo.com",
      autos: [
        { marca: "Chevrolet", modelo: "Onix", patente: "AH444QR", color: "Blanco" },
        { marca: "Honda", modelo: "HR-V", patente: "AJ555ST", color: "Gris" },
      ],
    },
    {
      nombre: "Pablo", apellido: "Martínez", telefono: "+54 11 6000-0006",
      autos: [{ marca: "Toyota", modelo: "Hilux", patente: "AK666UV", color: "Blanco" }],
    },
    {
      nombre: "Sofía", apellido: "López", telefono: "+54 11 6000-0007", email: "sofia@demo.com",
      autos: [{ marca: "Citroën", modelo: "C3", patente: "AL777WX", color: "Amarillo" }],
    },
    {
      nombre: "Ramiro", apellido: "Díaz", telefono: "+54 11 6000-0008",
      autos: [
        { marca: "Nissan", modelo: "Frontier", patente: "AM888YZ", color: "Gris" },
        { marca: "Fiat", modelo: "Toro", patente: "AN999AB", color: "Rojo" },
      ],
    },
  ];

  const clientes: Array<{ id: string; autos: string[] }> = [];
  for (const c of clientesData) {
    const cliente = await prisma.cliente.create({
      data: {
        lavaderoId: lavadero.id,
        nombre: c.nombre,
        apellido: c.apellido,
        telefono: c.telefono,
        email: c.email,
        passwordHash: c.conCuenta ? passwordHash : null,
      },
    });
    const autos: string[] = [];
    for (const a of c.autos) {
      const auto = await prisma.auto.create({
        data: { ...a, lavaderoId: lavadero.id, clienteId: cliente.id },
      });
      autos.push(auto.id);
    }
    clientes.push({ id: cliente.id, autos });
  }

  // Vincular Carla y Diego (pareja): simétrico
  await prisma.$transaction([
    prisma.cliente.update({
      where: { id: clientes[0].id },
      data: { vinculadoConId: clientes[1].id },
    }),
    prisma.cliente.update({
      where: { id: clientes[1].id },
      data: { vinculadoConId: clientes[0].id },
    }),
  ]);

  // ===== Descuentos =====
  await prisma.descuento.createMany({
    data: [
      {
        lavaderoId: lavadero.id,
        nombre: "10% en lavado avanzado",
        descripcion: "Descuento exclusivo para clientes Plata o superior",
        tipo: "PORCENTAJE",
        valor: 10,
        nivelId: nivelPlata.id,
      },
      {
        lavaderoId: lavadero.id,
        nombre: "Encerado sin cargo",
        descripcion: "Un encerado gratis por mes para clientes Oro",
        tipo: "MONTO_FIJO",
        valor: 6000,
        nivelId: nivelOro.id,
      },
      {
        lavaderoId: lavadero.id,
        nombre: "15% los martes",
        descripcion: "Todos los martes, 15% en cualquier lavado",
        tipo: "PORCENTAJE",
        valor: 15,
      },
    ],
  });

  // ===== Lavados históricos (cronológicos, con gamificación real) =====
  const principales = ["Lavado básico", "Lavado avanzado", "Lavado premium"];
  const addons = ["Encerado", "Lavado de chasis", "Lavado de motor"];
  let creados = 0;

  // Distribuye ~25 lavados en los últimos 60 días entre los clientes
  const plan: Array<{ clienteIdx: number; diasAtras: number; hora: number; servicio: string; addon?: string }> = [
    { clienteIdx: 0, diasAtras: 58, hora: 10, servicio: "Lavado avanzado", addon: "Encerado" },
    { clienteIdx: 0, diasAtras: 47, hora: 11, servicio: "Lavado premium" },
    { clienteIdx: 0, diasAtras: 36, hora: 9, servicio: "Lavado avanzado" },
    { clienteIdx: 0, diasAtras: 25, hora: 15, servicio: "Lavado premium", addon: "Lavado de motor" },
    { clienteIdx: 0, diasAtras: 14, hora: 10, servicio: "Lavado avanzado", addon: "Lavado de chasis" },
    { clienteIdx: 0, diasAtras: 4, hora: 16, servicio: "Lavado premium", addon: "Encerado" },
    { clienteIdx: 1, diasAtras: 50, hora: 9, servicio: "Lavado básico" },
    { clienteIdx: 1, diasAtras: 30, hora: 14, servicio: "Lavado avanzado" },
    { clienteIdx: 1, diasAtras: 10, hora: 11, servicio: "Lavado básico", addon: "Encerado" },
    { clienteIdx: 2, diasAtras: 55, hora: 10, servicio: "Lavado básico" },
    { clienteIdx: 2, diasAtras: 42, hora: 12, servicio: "Lavado avanzado" },
    { clienteIdx: 2, diasAtras: 28, hora: 9, servicio: "Lavado avanzado", addon: "Lavado de chasis" },
    { clienteIdx: 2, diasAtras: 13, hora: 15, servicio: "Lavado premium" },
    { clienteIdx: 2, diasAtras: 2, hora: 10, servicio: "Lavado básico" },
    { clienteIdx: 3, diasAtras: 40, hora: 16, servicio: "Lavado básico" },
    { clienteIdx: 3, diasAtras: 5, hora: 10, servicio: "Lavado avanzado" },
    { clienteIdx: 4, diasAtras: 45, hora: 11, servicio: "Lavado avanzado" },
    { clienteIdx: 4, diasAtras: 33, hora: 10, servicio: "Lavado básico", addon: "Lavado de motor" },
    { clienteIdx: 4, diasAtras: 20, hora: 14, servicio: "Lavado avanzado" },
    { clienteIdx: 4, diasAtras: 8, hora: 9, servicio: "Lavado premium", addon: "Encerado" },
    { clienteIdx: 5, diasAtras: 22, hora: 13, servicio: "Lavado básico" },
    { clienteIdx: 6, diasAtras: 35, hora: 10, servicio: "Lavado avanzado" },
    { clienteIdx: 6, diasAtras: 18, hora: 11, servicio: "Lavado básico" },
    { clienteIdx: 7, diasAtras: 27, hora: 15, servicio: "Lavado premium", addon: "Lavado de chasis" },
    { clienteIdx: 7, diasAtras: 6, hora: 12, servicio: "Lavado avanzado" },
  ];

  // Orden cronológico para que la racha sea coherente
  plan.sort((a, b) => b.diasAtras - a.diasAtras);

  for (const p of plan) {
    const cliente = clientes[p.clienteIdx];
    const servicio = servicios[p.servicio];
    const addon = p.addon ? servicios[p.addon] : null;
    const dia = diasDesdeHoy(-p.diasAtras);
    const llegada = fechaAR(dia, p.hora, 0);
    const inicio = fechaAR(dia, p.hora, 10);
    const fin = new Date(inicio.getTime() + servicio.duracionMin * 60 * 1000);
    const precioFinal = servicio.precio + (addon ? (p.addon === "Encerado" ? 6000 : p.addon === "Lavado de chasis" ? 7000 : 9000) : 0);

    await prisma.$transaction(async (tx) => {
      const lavado = await tx.lavado.create({
        data: {
          lavaderoId: lavadero.id,
          clienteId: cliente.id,
          autoId: cliente.autos[creados % cliente.autos.length],
          servicioId: servicio.id,
          llegadaAt: llegada,
          inicioAt: inicio,
          precioFinal,
          addons: addon
            ? { create: [{ servicioId: addon.id, precio: precioFinal - servicio.precio }] }
            : undefined,
        },
      });
      await otorgarPuntosLavado(tx, lavado.id, fin);
    });
    creados++;
  }

  // ===== Turnos futuros =====
  const turnosPlan: Array<{
    clienteIdx: number;
    diasAdelante: number;
    hora: number;
    minuto?: number;
    servicio: string;
    estado: "PENDIENTE" | "CONFIRMADO" | "CANCELADO";
    origen?: "CLIENTE" | "ADMIN";
  }> = [
    { clienteIdx: 0, diasAdelante: 1, hora: 10, servicio: "Lavado avanzado", estado: "CONFIRMADO" },
    { clienteIdx: 1, diasAdelante: 1, hora: 10, servicio: "Lavado básico", estado: "CONFIRMADO" },
    { clienteIdx: 2, diasAdelante: 1, hora: 15, servicio: "Lavado premium", estado: "PENDIENTE" },
    { clienteIdx: 3, diasAdelante: 2, hora: 9, servicio: "Lavado básico", estado: "CONFIRMADO", origen: "ADMIN" },
    { clienteIdx: 4, diasAdelante: 2, hora: 11, minuto: 30, servicio: "Lavado avanzado", estado: "PENDIENTE" },
    { clienteIdx: 5, diasAdelante: 3, hora: 14, servicio: "Lavado básico", estado: "CONFIRMADO" },
    { clienteIdx: 6, diasAdelante: 3, hora: 16, servicio: "Lavado avanzado", estado: "CANCELADO" },
    { clienteIdx: 7, diasAdelante: 4, hora: 10, servicio: "Lavado premium", estado: "PENDIENTE" },
    { clienteIdx: 0, diasAdelante: 5, hora: 9, minuto: 30, servicio: "Lavado básico", estado: "CONFIRMADO" },
    { clienteIdx: 2, diasAdelante: 6, hora: 11, servicio: "Lavado avanzado", estado: "PENDIENTE" },
  ];

  for (const t of turnosPlan) {
    const cliente = clientes[t.clienteIdx];
    const servicio = servicios[t.servicio];
    await prisma.turno.create({
      data: {
        lavaderoId: lavadero.id,
        clienteId: cliente.id,
        autoId: cliente.autos[0],
        servicioId: servicio.id,
        fechaTurno: fechaAR(diasDesdeHoy(t.diasAdelante), t.hora, t.minuto ?? 0),
        duracionMin: servicio.duracionMin,
        estado: t.estado,
        origen: t.origen ?? "CLIENTE",
        canceladoMotivo: t.estado === "CANCELADO" ? "Cancelado por el cliente" : null,
      },
    });
  }

  console.log(`Seed OK: ${creados} lavados, ${turnosPlan.length} turnos, ${clientes.length} clientes.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
