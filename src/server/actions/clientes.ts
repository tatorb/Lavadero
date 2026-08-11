"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { Prisma, TipoVehiculo, TipoVinculo } from "@prisma/client";

import { permisoStaff, requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { normalizarNombre } from "@/lib/clientes/duplicados";
import { recalcularGamificacion } from "@/lib/gamificacion/recalcular";

export type EstadoAccion = { error?: string; ok?: boolean; id?: string } | undefined;

const clienteSchema = z.object({
  nombre: z.string().min(2, "Nombre demasiado corto"),
  apellido: z.string().optional(),
  telefono: z.string().optional(),
  email: z
    .string()
    .email("Email inválido")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  tipoRelacion: z.enum(["CLIENTE", "AMIGO", "FAMILIAR", "DESCONOCIDO"]).optional(),
  origen: z.string().optional(),
  detalles: z.string().optional(),
});

const limpio = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > 0 ? s : null;
};

/**
 * Alta de cliente con todo lo que lo acompaña: el auto con el que llega y la
 * pareja o familiar con quien comparte. Cargarlos en el mismo paso evita que
 * el cliente quede a medias cuando hay alguien esperando en el mostrador.
 */
export async function crearCliente(
  _prev: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  const user = await requireStaff();
  const parsed = clienteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const email = parsed.data.email?.toLowerCase().trim();

  if (email) {
    const existente = await prisma.cliente.findUnique({
      where: { lavaderoId_email: { lavaderoId: user.lavaderoId, email } },
    });
    if (existente) return { error: "Ya existe un cliente con ese email" };
  }

  // --- Auto (opcional): si viene la marca o el modelo, van los dos ---
  const marca = limpio(formData.get("autoMarca"));
  const modelo = limpio(formData.get("autoModelo"));
  if ((marca && !modelo) || (!marca && modelo)) {
    return { error: "Para cargar el auto necesito la marca y el modelo" };
  }
  const patente = limpio(formData.get("autoPatente"))?.toUpperCase().replace(/\s/g, "") ?? null;
  if (patente && (await patenteDuplicada(user.lavaderoId, patente))) {
    return { error: "Ya existe un auto con esa patente" };
  }
  const auto = marca && modelo ? {
    marca,
    modelo,
    patente,
    tipo: (limpio(formData.get("autoTipo")) ?? "AUTO") as TipoVehiculo,
    color: limpio(formData.get("autoColor")),
  } : null;

  // --- Vínculo (opcional): con alguien ya cargado, o creándolo acá mismo ---
  const vinculoTipo = (limpio(formData.get("vinculoTipo")) ?? "PAREJA") as TipoVinculo;
  const vinculoConId = limpio(formData.get("vinculoConId"));
  const vinculoNombre = limpio(formData.get("vinculoNombre"));

  if (vinculoConId) {
    const otro = await prisma.cliente.findFirst({
      where: { id: vinculoConId, lavaderoId: user.lavaderoId },
      select: { vinculadoConId: true },
    });
    if (!otro) return { error: "El cliente a vincular no existe" };
    if (otro.vinculadoConId) return { error: "Ese cliente ya está vinculado con otro" };
  }

  const cliente = await prisma.$transaction(async (tx) => {
    const creado = await tx.cliente.create({
      data: { ...parsed.data, email, lavaderoId: user.lavaderoId },
    });

    if (auto) {
      await tx.auto.create({
        data: { ...auto, clienteId: creado.id, lavaderoId: user.lavaderoId },
      });
    }

    if (vinculoConId) {
      await tx.cliente.update({
        where: { id: vinculoConId },
        data: { vinculadoConId: creado.id, vinculoTipo },
      });
      await tx.cliente.update({
        where: { id: creado.id },
        data: { vinculadoConId: vinculoConId, vinculoTipo },
      });
    } else if (vinculoNombre) {
      // La pareja tampoco estaba cargada: la creamos y los vinculamos
      const pareja = await tx.cliente.create({
        data: {
          nombre: vinculoNombre,
          apellido: limpio(formData.get("vinculoApellido")),
          lavaderoId: user.lavaderoId,
          vinculadoConId: creado.id,
          vinculoTipo,
        },
      });
      await tx.cliente.update({
        where: { id: creado.id },
        data: { vinculadoConId: pareja.id, vinculoTipo },
      });
    }

    return creado;
  });

  revalidatePath("/admin/clientes");
  return { ok: true, id: cliente.id };
}

export async function editarCliente(
  id: string,
  _prev: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  const user = await requireStaff();
  const parsed = clienteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const email = parsed.data.email?.toLowerCase().trim();

  const { count } = await prisma.cliente.updateMany({
    where: { id, lavaderoId: user.lavaderoId },
    data: { ...parsed.data, email: email ?? null },
  });
  if (count === 0) return { error: "Cliente no encontrado" };
  revalidatePath(`/admin/clientes/${id}`);
  revalidatePath("/admin/clientes");
  return { ok: true };
}

/**
 * Vincula dos clientes (pareja/familiar) de forma simétrica. `tipo` describe
 * qué son entre sí y se guarda en las dos filas.
 */
export async function vincularClientes(
  clienteId: string,
  otroId: string,
  tipo?: TipoVinculo
): Promise<EstadoAccion> {
  const user = await requireStaff();
  if (clienteId === otroId) return { error: "No se puede vincular un cliente consigo mismo" };

  const [a, b] = await Promise.all([
    prisma.cliente.findFirst({ where: { id: clienteId, lavaderoId: user.lavaderoId } }),
    prisma.cliente.findFirst({ where: { id: otroId, lavaderoId: user.lavaderoId } }),
  ]);
  if (!a || !b) return { error: "Cliente no encontrado" };
  if (a.vinculadoConId || b.vinculadoConId)
    return { error: "Alguno de los dos ya está vinculado a otro cliente" };

  await prisma.$transaction([
    prisma.cliente.update({
      where: { id: a.id },
      data: { vinculadoConId: b.id, vinculoTipo: tipo ?? null },
    }),
    prisma.cliente.update({
      where: { id: b.id },
      data: { vinculadoConId: a.id, vinculoTipo: tipo ?? null },
    }),
  ]);
  revalidatePath(`/admin/clientes/${clienteId}`);
  revalidatePath(`/admin/clientes/${otroId}`);
  revalidatePath("/admin/clientes/vinculos");
  return { ok: true };
}

export async function desvincularCliente(clienteId: string): Promise<EstadoAccion> {
  const user = await requireStaff();
  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, lavaderoId: user.lavaderoId },
  });
  if (!cliente?.vinculadoConId) return { error: "El cliente no está vinculado" };

  await prisma.$transaction([
    prisma.cliente.update({
      where: { id: cliente.id },
      data: { vinculadoConId: null, vinculoTipo: null },
    }),
    prisma.cliente.update({
      where: { id: cliente.vinculadoConId },
      data: { vinculadoConId: null, vinculoTipo: null },
    }),
  ]);
  revalidatePath(`/admin/clientes/${clienteId}`);
  revalidatePath("/admin/clientes/vinculos");
  return { ok: true };
}

// ===== Fusión y archivado =====

/** Campos de texto que se completan desde el duplicado si el principal los tiene vacíos. */
const CAMPOS_HEREDABLES = ["telefono", "detalles", "origen", "nombreOriginal"] as const;

export interface ResumenFusion {
  principal: string;
  duplicado: string;
  lavados: number;
  autos: number;
  turnos: number;
  puntos: number;
  movimientosCuenta: number;
  movimientosCaja: number;
  /** Avisos sobre datos que se pierden o cambian al fusionar. */
  avisos: string[];
}

const nombreDe = (c: { nombre: string; apellido: string | null }) =>
  [c.nombre, c.apellido].filter(Boolean).join(" ");

/**
 * Calcula qué pasaría al fusionar, sin tocar nada. La pantalla lo muestra
 * antes de confirmar porque la fusión no se puede deshacer.
 */
export async function previsualizarFusion(
  principalId: string,
  duplicadoId: string
): Promise<{ error?: string; resumen?: ResumenFusion }> {
  const permiso = await permisoStaff(["ADMIN"]);
  if ("error" in permiso) return { error: permiso.error };
  const { user } = permiso;
  if (principalId === duplicadoId) return { error: "Elegí dos clientes distintos" };

  const [principal, duplicado] = await Promise.all([
    prisma.cliente.findFirst({ where: { id: principalId, lavaderoId: user.lavaderoId } }),
    prisma.cliente.findFirst({
      where: { id: duplicadoId, lavaderoId: user.lavaderoId },
      include: {
        _count: {
          select: {
            lavados: true,
            autos: true,
            turnos: true,
            movimientos: true,
            movimientosCuenta: true,
            movimientosCaja: true,
          },
        },
      },
    }),
  ]);
  if (!principal || !duplicado) return { error: "Cliente no encontrado" };

  const avisos: string[] = [];
  if (duplicado.passwordHash) {
    avisos.push(
      principal.passwordHash
        ? `La cuenta de la app de ${nombreDe(duplicado)} se da de baja; queda la de ${nombreDe(principal)}.`
        : `La cuenta de la app de ${nombreDe(duplicado)} pasa a ${nombreDe(principal)}.`
    );
  }
  if (duplicado.email && principal.email && duplicado.email !== principal.email) {
    avisos.push(`Se descarta el email ${duplicado.email}; queda ${principal.email}.`);
  }
  if (duplicado.vinculadoConId && duplicado.vinculadoConId !== principal.id) {
    avisos.push(
      principal.vinculadoConId
        ? "Se pierde el vínculo del duplicado; se mantiene el del principal."
        : "El vínculo de pareja/familiar pasa al cliente principal."
    );
  }
  if (principal.vinculadoConId === duplicado.id) {
    avisos.push("Los dos estaban vinculados entre sí: el vínculo se elimina.");
  }
  avisos.push("Los puntos, la racha y el nivel se recalculan sobre el historial unificado.");

  return {
    resumen: {
      principal: nombreDe(principal),
      duplicado: nombreDe(duplicado),
      lavados: duplicado._count.lavados,
      autos: duplicado._count.autos,
      turnos: duplicado._count.turnos,
      puntos: duplicado.puntosTotal,
      movimientosCuenta: duplicado._count.movimientosCuenta,
      movimientosCaja: duplicado._count.movimientosCaja,
      avisos,
    },
  };
}

/**
 * Fusiona `duplicadoId` dentro de `principalId`: mueve autos, lavados, turnos,
 * puntos y movimientos de cuenta/caja al principal, completa los datos que le
 * falten, recalcula la gamificación y borra el duplicado.
 *
 * Es irreversible, así que solo lo puede hacer un ADMIN.
 */
export async function fusionarClientes(
  principalId: string,
  duplicadoId: string
): Promise<EstadoAccion> {
  const permiso = await permisoStaff(["ADMIN"]);
  if ("error" in permiso) return { error: permiso.error };
  const { user } = permiso;
  if (principalId === duplicadoId) return { error: "Elegí dos clientes distintos" };

  const [principal, duplicado] = await Promise.all([
    prisma.cliente.findFirst({ where: { id: principalId, lavaderoId: user.lavaderoId } }),
    prisma.cliente.findFirst({ where: { id: duplicadoId, lavaderoId: user.lavaderoId } }),
  ]);
  if (!principal || !duplicado) return { error: "Cliente no encontrado" };

  const vinculoAHeredar =
    duplicado.vinculadoConId && duplicado.vinculadoConId !== principal.id
      ? duplicado.vinculadoConId
      : null;

  await prisma.$transaction(async (tx) => {
    // 1. Soltar los vínculos del duplicado (y el mutuo, si estaban vinculados
    //    entre sí) antes de mover nada: vinculadoConId es único.
    if (duplicado.vinculadoConId) {
      await tx.cliente.update({
        where: { id: duplicado.vinculadoConId },
        data: { vinculadoConId: null },
      });
      await tx.cliente.update({ where: { id: duplicado.id }, data: { vinculadoConId: null } });
    }
    if (principal.vinculadoConId === duplicado.id) {
      await tx.cliente.update({ where: { id: principal.id }, data: { vinculadoConId: null } });
    }

    // 2. Liberar el email del duplicado antes de heredarlo (único por lavadero)
    await tx.cliente.update({
      where: { id: duplicado.id },
      data: { email: null, passwordHash: null },
    });

    // 3. Mover todo lo que cuelga del duplicado
    const alPrincipal = { where: { clienteId: duplicado.id }, data: { clienteId: principal.id } };
    await tx.auto.updateMany(alPrincipal);
    await tx.turno.updateMany(alPrincipal);
    await tx.lavado.updateMany(alPrincipal);
    await tx.puntosMovimiento.updateMany(alPrincipal);
    await tx.movimientoCuenta.updateMany(alPrincipal);
    await tx.movimientoCaja.updateMany(alPrincipal);

    // 4. Completar los datos que el principal no tenga
    const datos: Prisma.ClienteUpdateInput = {};
    for (const campo of CAMPOS_HEREDABLES) {
      if (!principal[campo] && duplicado[campo]) datos[campo] = duplicado[campo];
    }
    if (!principal.email && duplicado.email) datos.email = duplicado.email;
    if (!principal.passwordHash && duplicado.passwordHash)
      datos.passwordHash = duplicado.passwordHash;
    if (principal.tipoRelacion === "DESCONOCIDO" && duplicado.tipoRelacion !== "DESCONOCIDO")
      datos.tipoRelacion = duplicado.tipoRelacion;
    if (principal.visitasAnotadas !== null || duplicado.visitasAnotadas !== null)
      datos.visitasAnotadas =
        (principal.visitasAnotadas ?? 0) + (duplicado.visitasAnotadas ?? 0);
    // Las notas del duplicado se anexan en vez de perderse
    if (principal.detalles && duplicado.detalles && principal.detalles !== duplicado.detalles)
      datos.detalles = `${principal.detalles}\n${duplicado.detalles}`;
    if (vinculoAHeredar && !principal.vinculadoConId) {
      datos.vinculadoCon = { connect: { id: vinculoAHeredar } };
      datos.vinculoTipo = duplicado.vinculoTipo;
    }

    if (Object.keys(datos).length > 0) {
      await tx.cliente.update({ where: { id: principal.id }, data: datos });
    }
    if (vinculoAHeredar && !principal.vinculadoConId) {
      await tx.cliente.update({
        where: { id: vinculoAHeredar },
        data: { vinculadoConId: principal.id, vinculoTipo: duplicado.vinculoTipo },
      });
    }

    // 5. El duplicado ya no tiene nada colgando
    await tx.cliente.delete({ where: { id: duplicado.id } });

    await recalcularGamificacion(tx, principal.id);
  });

  revalidatePath("/admin/clientes");
  revalidatePath("/admin/clientes/fusionar");
  revalidatePath(`/admin/clientes/${principalId}`);
  revalidatePath("/admin/lavados");
  return { ok: true, id: principalId };
}

/**
 * Da de baja un cliente sin borrar su historial. Sirve para las filas del
 * registro histórico que no son personas ("Mazda Chata", "3 Vez"): dejan de
 * aparecer en los listados y selectores, pero los lavados siguen contando.
 */
export async function archivarCliente(
  clienteId: string,
  archivar: boolean
): Promise<EstadoAccion> {
  const permiso = await permisoStaff(["ADMIN"]);
  if ("error" in permiso) return { error: permiso.error };
  const { user } = permiso;
  const { count } = await prisma.cliente.updateMany({
    where: { id: clienteId, lavaderoId: user.lavaderoId },
    data: { activo: !archivar },
  });
  if (count === 0) return { error: "Cliente no encontrado" };

  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${clienteId}`);
  return { ok: true };
}

export interface ResumenEliminacion {
  nombre: string;
  lavados: number;
  turnos: number;
  autos: number;
  puntos: number;
  movimientosCuenta: number;
  /** Se despegan del cliente pero NO se borran: la caja no se toca */
  movimientosCaja: number;
  /** Plata cobrada que deja de sumar en los reportes */
  importeCobrado: number;
  vinculadoCon: string | null;
  /** Sin historial: se puede borrar sin perder nada */
  limpio: boolean;
}

/** Qué se pierde al eliminar. La pantalla lo muestra antes de confirmar. */
export async function previsualizarEliminacion(
  clienteId: string
): Promise<{ error?: string; resumen?: ResumenEliminacion }> {
  const permiso = await permisoStaff(["ADMIN"]);
  if ("error" in permiso) return { error: permiso.error };
  const { user } = permiso;
  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, lavaderoId: user.lavaderoId },
    include: {
      vinculadoCon: { select: { nombre: true, apellido: true } },
      _count: {
        select: {
          lavados: true,
          turnos: true,
          autos: true,
          movimientos: true,
          movimientosCuenta: true,
          movimientosCaja: true,
        },
      },
    },
  });
  if (!cliente) return { error: "Cliente no encontrado" };

  const cobrado = await prisma.lavado.aggregate({
    where: { clienteId },
    _sum: { importeCobrado: true },
  });

  const c = cliente._count;
  return {
    resumen: {
      nombre: nombreDe(cliente),
      lavados: c.lavados,
      turnos: c.turnos,
      autos: c.autos,
      puntos: cliente.puntosTotal,
      movimientosCuenta: c.movimientosCuenta,
      movimientosCaja: c.movimientosCaja,
      importeCobrado: cobrado._sum.importeCobrado?.toNumber() ?? 0,
      vinculadoCon: cliente.vinculadoCon ? nombreDe(cliente.vinculadoCon) : null,
      limpio: c.lavados === 0 && c.turnos === 0 && c.movimientosCuenta === 0,
    },
  };
}

/**
 * Borra un cliente y todo lo que cuelga de él. Irreversible.
 *
 * Los movimientos de caja NO se borran: se despegan del cliente. Esa plata
 * entró o salió de verdad y el arqueo tiene que seguir cerrando. Los lavados
 * sí desaparecen, así que los ingresos del mes bajan — por eso, cuando el
 * cliente tiene historial, hay que escribir su nombre para confirmar.
 *
 * Para las filas que solo molestan en los listados conviene `archivarCliente`,
 * que las esconde sin perder nada.
 */
export async function eliminarCliente(
  clienteId: string,
  confirmacion?: string
): Promise<EstadoAccion> {
  const permiso = await permisoStaff(["ADMIN"]);
  if ("error" in permiso) return { error: permiso.error };
  const { user } = permiso;
  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, lavaderoId: user.lavaderoId },
    include: { _count: { select: { lavados: true, turnos: true, movimientosCuenta: true } } },
  });
  if (!cliente) return { error: "Cliente no encontrado" };

  const limpio =
    cliente._count.lavados === 0 &&
    cliente._count.turnos === 0 &&
    cliente._count.movimientosCuenta === 0;

  if (!limpio) {
    const esperado = normalizarNombre(nombreDe(cliente));
    if (!confirmacion || normalizarNombre(confirmacion) !== esperado) {
      return { error: "Escribí el nombre del cliente tal cual para confirmar" };
    }
  }

  const lavados = await prisma.lavado.findMany({
    where: { clienteId },
    select: { id: true },
  });
  const lavadoIds = lavados.map((l) => l.id);

  await prisma.$transaction(async (tx) => {
    // El vínculo es único en las dos filas: hay que soltarlo antes de borrar
    if (cliente.vinculadoConId) {
      await tx.cliente.update({
        where: { id: cliente.vinculadoConId },
        data: { vinculadoConId: null, vinculoTipo: null },
      });
      await tx.cliente.update({
        where: { id: cliente.id },
        data: { vinculadoConId: null, vinculoTipo: null },
      });
    }

    // La caja se conserva: solo pierde la referencia al cliente y al lavado
    await tx.movimientoCaja.updateMany({
      where: {
        lavaderoId: user.lavaderoId,
        OR: [{ clienteId }, ...(lavadoIds.length ? [{ lavadoId: { in: lavadoIds } }] : [])],
      },
      data: { clienteId: null, lavadoId: null },
    });

    await tx.movimientoCuenta.deleteMany({ where: { clienteId } });
    await tx.puntosMovimiento.deleteMany({ where: { clienteId } });
    // Pago y LavadoAddon caen por cascada con el lavado
    await tx.lavado.deleteMany({ where: { clienteId } });
    await tx.turno.deleteMany({ where: { clienteId } });
    await tx.auto.deleteMany({ where: { clienteId } });
    await tx.cliente.delete({ where: { id: clienteId } });
  });

  revalidatePath("/admin/clientes");
  revalidatePath("/admin/lavados");
  revalidatePath("/admin/caja");
  return { ok: true };
}

// ===== Autos =====

const autoSchema = z.object({
  marca: z.string().min(2, "Ingresá la marca"),
  modelo: z.string().min(1, "Ingresá el modelo"),
  patente: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.toUpperCase().replace(/\s/g, "") : null)),
  tipo: z.enum([
    "AUTO",
    "SUV",
    "PICKUP",
    "PICKUP_GRANDE",
    "UTILITARIO",
    "UTILITARIO_GRANDE",
    "MOTO",
    "MOTORHOME",
    "UTV",
    "OTRO",
  ]),
  color: z.string().optional(),
  detalles: z.string().optional(),
});

async function patenteDuplicada(lavaderoId: string, patente: string, exceptoId?: string) {
  const existente = await prisma.auto.findUnique({
    where: { lavaderoId_patente: { lavaderoId, patente } },
  });
  return existente !== null && existente.id !== exceptoId;
}

export async function crearAuto(
  clienteId: string,
  _prev: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  const user = await requireStaff();
  const parsed = autoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { patente, ...datos } = parsed.data;

  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, lavaderoId: user.lavaderoId },
  });
  if (!cliente) return { error: "Cliente no encontrado" };

  if (patente && (await patenteDuplicada(user.lavaderoId, patente))) {
    return { error: "Ya existe un auto con esa patente" };
  }

  await prisma.auto.create({
    data: { ...datos, patente, clienteId, lavaderoId: user.lavaderoId },
  });
  revalidatePath(`/admin/clientes/${clienteId}`);
  return { ok: true };
}

export async function editarAuto(
  autoId: string,
  _prev: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  const user = await requireStaff();
  const parsed = autoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { patente, ...datos } = parsed.data;

  const auto = await prisma.auto.findFirst({
    where: { id: autoId, lavaderoId: user.lavaderoId },
  });
  if (!auto) return { error: "Auto no encontrado" };

  if (patente && (await patenteDuplicada(user.lavaderoId, patente, autoId))) {
    return { error: "Ya existe otro auto con esa patente" };
  }

  await prisma.auto.update({
    where: { id: autoId },
    data: { ...datos, patente },
  });
  revalidatePath(`/admin/clientes/${auto.clienteId}`);
  return { ok: true };
}
