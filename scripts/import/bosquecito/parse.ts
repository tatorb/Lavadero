import type { TipoRelacion, TipoVehiculo } from "@prisma/client";

import { REGISTRO } from "./registro";

import { parsearServicio } from "./catalogo";
import {
  NOMBRES_FAMILIARES,
  detectarOrigen,
  infoModelo,
  normalizarClave,
  normalizarModelo,
  normalizarNombre,
} from "./normalizacion";

// El registro cubre octubre-diciembre de 2025 y enero-agosto de 2026
const ANIO_POR_MES = (mes: number) => (mes >= 9 ? 2025 : 2026);

const MESES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

export interface LavadoStaging {
  linea: number;
  fecha: string; // yyyy-MM-dd
  clienteKey: string;
  autoKey: string;
  servicioPrincipal: string;
  addons: string[];
  servicioOriginal: string;
  importeCobrado: number | null;
  esCortesia: boolean;
  estadoPago: "PAGADO" | "PARCIAL" | "PENDIENTE" | "CORTESIA" | "SIN_DATO";
  formaPago: "EFECTIVO" | "TRANSFERENCIA" | "MIXTO" | "OTRO" | "SIN_DATO";
  pagos: Array<{ medio: "EFECTIVO" | "TRANSFERENCIA"; importe: number }>;
  deuda: number | null;
  saldoAFavor: number | null;
  visitasAnotadas: number | null;
  observaciones: string[];
  revision: string[];
}

export interface ClienteStaging {
  key: string;
  nombre: string;
  nombresOriginales: Set<string>;
  relacion: TipoRelacion;
  origen: string | null;
  telefono: string | null;
  visitasAnotadas: number | null;
  observaciones: Set<string>;
}

export interface AutoStaging {
  key: string; // clienteKey::modelo
  clienteKey: string;
  modelo: string;
  marca: string;
  tipo: TipoVehiculo;
  descripcionOriginal: string;
}

export interface CajaStaging {
  linea: number;
  fecha: string;
  tipo: "INGRESO" | "EGRESO";
  categoria: string;
  concepto: string;
  conceptoOriginal: string;
  importe: number;
  formaPago: "EFECTIVO" | "TRANSFERENCIA" | "SIN_DATO";
}

export interface Staging {
  lavados: LavadoStaging[];
  clientes: Map<string, ClienteStaging>;
  autos: Map<string, AutoStaging>;
  caja: CajaStaging[];
  controles: Array<{ linea: number; texto: string }>;
  conflictos: Array<{ linea: number; texto: string; motivo: string }>;
}

function parseImporte(texto: string): number | null {
  const limpio = texto.replace(/\$/g, "").replace(/\./g, "").replace(/,/g, "").trim();
  if (!/^\d+$/.test(limpio)) return null;
  const n = Number(limpio);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** "20" en contexto de pago mixto suele ser miles: 20 → 20000. */
function escalarMiles(n: number): number {
  return n < 1000 ? n * 1000 : n;
}

function categoriaGasto(texto: string): string {
  const t = normalizarClave(texto);
  if (/nafta|combustible/.test(t)) return "Combustible";
  if (/agua/.test(t)) return "Agua";
  if (/sueldo/.test(t)) return "Sueldos";
  if (/cartel|postes|clavos|banderas|tela/.test(t)) return "Cartelería";
  if (/manguera|mantenimiento/.test(t)) return "Mantenimiento";
  if (/remera|botas|ropa/.test(t)) return "Ropa de trabajo";
  if (/comida|desayuno|medialunas/.test(t)) return "Comida";
  if (/producto|igapo|silicona|desengrasante|toalla|cepillo|envio/.test(t))
    return "Productos";
  return "Otros";
}

export function parseRegistro(contenido: string = REGISTRO): Staging {
  const lineas = contenido.split("\n");

  const staging: Staging = {
    lavados: [],
    clientes: new Map(),
    autos: new Map(),
    caja: [],
    controles: [],
    conflictos: [],
  };

  let mesContexto = 10;
  let ultimaFecha = "2025-10-01";

  const registrarCliente = (
    nombreOriginal: string,
    relacionCelda: string,
    comoLlego: string | null
  ): ClienteStaging => {
    const nombre = normalizarNombre(nombreOriginal);
    const key = normalizarClave(nombre) || "sin identificar";
    let cliente = staging.clientes.get(key);
    if (!cliente) {
      cliente = {
        key,
        nombre: key === "sin identificar" ? "Sin identificar" : nombre,
        nombresOriginales: new Set(),
        relacion: "CLIENTE",
        origen: null,
        telefono: null,
        visitasAnotadas: null,
        observaciones: new Set(),
      };
      staging.clientes.set(key, cliente);
    }
    cliente.nombresOriginales.add(nombreOriginal.trim());

    const rel = normalizarClave(relacionCelda);
    if (rel.includes("amigo")) cliente.relacion = "AMIGO";
    if (NOMBRES_FAMILIARES.includes(key)) cliente.relacion = "FAMILIAR";
    if (key === "sin identificar") cliente.relacion = "DESCONOCIDO";

    if (comoLlego) {
      const telefono = comoLlego.match(/\d{8,}/)?.[0];
      if (telefono && !cliente.telefono) cliente.telefono = telefono;
      const origen = detectarOrigen(comoLlego);
      if (origen && !cliente.origen) cliente.origen = origen;
    }
    return cliente;
  };

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i].trim();
    const nro = i + 1;
    if (!linea) continue;
    if (/^\|?\s*Nombre Cliente/i.test(linea)) continue;

    // Encabezado de mes: "Diciembre $678500 L 39 %48" — control de conciliación
    const mesMatch = linea.match(
      /^(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)\b/i
    );
    if (mesMatch && !linea.includes("|")) {
      mesContexto = MESES[mesMatch[1].toLowerCase()];
      staging.controles.push({ linea: nro, texto: linea });
      continue;
    }

    // Línea de gasto / movimiento de caja (con o sin fecha y pipes).
    // El (?![a-zá]) evita confundir "Gasto" con el cliente "Gaston".
    const esGasto =
      /(^|\|\s*)(gastos?(?![a-zá])|pago provedor|pago proveedor|pague(?![a-zá])|faltante|carteles pago|pago sueldo)/i.test(
        linea
      ) && /[\d.]{2,}/.test(linea);
    if (esGasto) {
      const importeMatch = linea.match(/\$\s*([\d.,]+)/);
      let importe = importeMatch ? parseImporte(importeMatch[1]) : null;
      if (importe == null) {
        // "Gastos Clavos cartel 10k" → 10.000
        const kMatch = linea.match(/(\d+)\s*k\b/i);
        if (kMatch) importe = Number(kMatch[1]) * 1000;
      }
      if (!importe) {
        staging.conflictos.push({ linea: nro, texto: linea, motivo: "Gasto sin importe legible" });
        continue;
      }
      const fechaEnLinea = linea.match(/(\d{1,2})-(\d{1,2})/);
      let fecha = ultimaFecha;
      if (fechaEnLinea) {
        const d = Number(fechaEnLinea[1]);
        const m = Number(fechaEnLinea[2]);
        if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
          fecha = `${ANIO_POR_MES(m)}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        }
      }
      const forma = /transf/i.test(linea)
        ? "TRANSFERENCIA"
        : /eft|efectivo/i.test(linea)
          ? "EFECTIVO"
          : "SIN_DATO";
      staging.caja.push({
        linea: nro,
        fecha,
        tipo: "EGRESO",
        categoria: categoriaGasto(linea),
        concepto: linea.replace(/\s*\|\s*/g, " ").slice(0, 120),
        conceptoOriginal: linea,
        importe,
        formaPago: forma,
      });
      continue;
    }

    // Subtotales / líneas de solo números → control de conciliación
    if (/^[\d.,\s|]+$/.test(linea)) {
      staging.controles.push({ linea: nro, texto: linea });
      continue;
    }

    if (!linea.includes("|")) {
      // Texto suelto no clasificado (ej. "45 Roman uber 03-01 (CAJA LAVADERO)")
      staging.conflictos.push({ linea: nro, texto: linea, motivo: "Línea no clasificable" });
      continue;
    }

    // Fila de lavado
    const celdas = linea.split("|").map((c) => c.trim());
    const fechaCelda = celdas[0];
    const fechaMatch = fechaCelda.match(/^(\d{1,2})(?:-(\d{1,2}))?$/);
    if (!fechaMatch) {
      staging.conflictos.push({
        linea: nro,
        texto: linea,
        motivo: "Primera columna no es una fecha",
      });
      continue;
    }

    const revision: string[] = [];
    const dia = Number(fechaMatch[1]);
    let mes = fechaMatch[2] ? Number(fechaMatch[2]) : mesContexto;
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) {
      revision.push(`Fecha original dudosa: "${fechaCelda}"`);
      mes = mesContexto;
    }
    if (fechaMatch[2] && mes !== mesContexto) {
      revision.push(
        `La fecha "${fechaCelda}" no coincide con el mes de la sección (${mesContexto})`
      );
    }
    const anio = ANIO_POR_MES(mes);
    let fechaFinal = `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    const fechaDate = new Date(`${fechaFinal}T12:00:00Z`);
    if (Number.isNaN(fechaDate.getTime()) || fechaDate.getUTCDate() !== dia) {
      revision.push(`Día inválido para el mes: "${fechaCelda}"`);
      fechaFinal = `${anio}-${String(mes).padStart(2, "0")}-28`;
    }
    ultimaFecha = fechaFinal;

    const [, nombreCelda = "", vehiculoCelda = "", servicioCelda = "", precioCelda = "", relacionCelda = "", formaCelda = "", comoLlegoCelda = "", cantidadCelda = ""] =
      celdas;

    // Nombre
    let nombreOriginal = nombreCelda;
    if (!nombreOriginal || ["-", "?", "x"].includes(normalizarClave(nombreOriginal))) {
      nombreOriginal = "Sin identificar";
      revision.push("Registro sin nombre de cliente");
    }

    // Detección de columnas corridas: precio numérico en la columna de vehículo
    let vehiculo = vehiculoCelda;
    let servicioTexto = servicioCelda;
    let precioTexto = precioCelda;
    if (parseImporte(vehiculoCelda) !== null && parseImporte(precioCelda) !== null) {
      // ej: "Clever | 16500 | Hrv | 16500" → vehículo real en la 3ra columna
      vehiculo = servicioCelda;
      servicioTexto = "Normal";
      revision.push("Columnas corridas en el registro original");
    }
    if (parseImporte(servicioCelda) !== null && parseImporte(precioCelda) === null) {
      // servicio y precio invertidos
      servicioTexto = precioCelda;
      precioTexto = servicioCelda;
      revision.push("Servicio y precio invertidos en el registro original");
    }

    // Vehículo raro tipo "Gratis Sorteo" (columna corrida en sorteos)
    if (/gratis|sorteo/i.test(vehiculo)) {
      revision.push(`Columna vehículo decía "${vehiculo}"`);
      vehiculo = "";
    }

    const observaciones: string[] = [];
    const cliente = registrarCliente(nombreOriginal, relacionCelda, comoLlegoCelda);

    // Servicio
    const servicioParseado = parsearServicio(servicioTexto || "Normal");
    if (!servicioParseado.reconocido) {
      revision.push(`Servicio no reconocido: "${servicioTexto}"`);
    }

    // Precio / cortesía
    let importeCobrado = parseImporte(precioTexto);
    let esCortesia = false;
    if (importeCobrado === null) {
      const t = normalizarClave(precioTexto);
      if (t === "gratis" || t === "-" || t === "" || /debia yo/.test(t)) {
        esCortesia = true;
        if (/debia yo/.test(t)) observaciones.push("Precio original: 'Debía yo'");
      } else {
        revision.push(`Precio no legible: "${precioTexto}"`);
      }
    }

    // Forma de pago
    const formaTexto = normalizarClave(formaCelda);
    let formaPago: LavadoStaging["formaPago"] = "SIN_DATO";
    let estadoPago: LavadoStaging["estadoPago"] = "SIN_DATO";
    const pagos: LavadoStaging["pagos"] = [];
    let deuda: number | null = null;

    const tieneTransfer = /transf/.test(formaTexto);
    const tieneEfectivo = /eft|efectivo/.test(formaTexto);

    if (/no pago|no pag/.test(formaTexto)) {
      const deudaMatch = formaTexto.match(/\$?\s*([\d.]+)\s*debe/);
      if (deudaMatch) {
        deuda = parseImporte(deudaMatch[1]);
        importeCobrado = importeCobrado != null && deuda != null ? importeCobrado - deuda : 0;
        estadoPago = "PARCIAL";
      } else {
        deuda = importeCobrado;
        importeCobrado = 0;
        estadoPago = "PENDIENTE";
      }
      observaciones.push(`Pago original: "${formaCelda}"`);
    } else if (/falta/.test(formaTexto) && tieneTransfer && tieneEfectivo) {
      // "8k eft-falta 7 transfer" → cobrado en efectivo, falta el resto
      const numeros = formaTexto.match(/\d+/g)?.map(Number) ?? [];
      if (numeros.length >= 2) {
        const cobrado = escalarMiles(numeros[0]);
        deuda = escalarMiles(numeros[1]);
        importeCobrado = cobrado;
        formaPago = "EFECTIVO";
        estadoPago = "PARCIAL";
        observaciones.push(`Pago original: "${formaCelda}"`);
      }
    } else if (tieneTransfer && tieneEfectivo) {
      formaPago = "MIXTO";
      estadoPago = esCortesia ? "CORTESIA" : "PAGADO";
      // "10 transfer y 13 eft" / "Efectivo 20 Transferencia 6"
      const partes = formaTexto.match(/(\d+)\s*k?\s*(transf\w*|eft|efectivo)|((transf\w*|eft|efectivo)\w*\s*(\d+))/g);
      if (partes) {
        for (const p of partes) {
          const num = p.match(/\d+/);
          if (!num) continue;
          const importe = escalarMiles(Number(num[0]));
          const medio = /transf/.test(p) ? "TRANSFERENCIA" : "EFECTIVO";
          pagos.push({ medio, importe });
        }
      }
      if (pagos.length !== 2) {
        pagos.length = 0;
        observaciones.push(`Pago mixto original: "${formaCelda}"`);
      }
    } else if (tieneTransfer) {
      formaPago = "TRANSFERENCIA";
      estadoPago = "PAGADO";
    } else if (tieneEfectivo) {
      formaPago = "EFECTIVO";
      estadoPago = "PAGADO";
    } else if (/gratis/.test(formaTexto)) {
      esCortesia = true;
    } else if (formaTexto && formaTexto !== "-" && formaTexto !== "?") {
      observaciones.push(`Forma de pago original: "${formaCelda}"`);
    }
    if (formaTexto.includes("fac")) observaciones.push("Facturado (FAC)");

    if (esCortesia) {
      estadoPago = "CORTESIA";
      formaPago = "SIN_DATO";
      importeCobrado = 0;
      deuda = null;
    }

    // "Cómo llegó" / observaciones / saldo a favor
    let saldoAFavor: number | null = null;
    if (comoLlegoCelda && !["-", "?"].includes(comoLlegoCelda.trim())) {
      const texto = comoLlegoCelda.trim();
      const origen = detectarOrigen(texto);
      const favorMatch = normalizarClave(texto).match(
        /(?:(\d+)\s*k?\s*(?:de mas|a favor))|(?:le quedan?\s*(\d+)\s*k?\s*(?:a favor)?)|(?:dio\s*(\d+)\s*k?\s*de mas)/
      );
      if (favorMatch) {
        const n = Number(favorMatch[1] ?? favorMatch[2] ?? favorMatch[3]);
        if (n > 0) saldoAFavor = escalarMiles(n);
      }
      if (!origen || /pago|precio|favor|debe|quej|desc/i.test(texto)) {
        observaciones.push(texto);
      }
    }

    // Cantidad anotada ("3 vez", "10", "24 Vez")
    let visitasAnotadas: number | null = null;
    const cantMatch = cantidadCelda.match(/(\d+)/);
    if (cantMatch) {
      visitasAnotadas = Number(cantMatch[1]);
      cliente.visitasAnotadas = Math.max(cliente.visitasAnotadas ?? 0, visitasAnotadas);
    }

    // Auto
    const modelo = normalizarModelo(vehiculo || "Sin datos");
    const info = infoModelo(modelo);
    const autoKey = `${cliente.key}::${normalizarClave(modelo)}`;
    if (!staging.autos.has(autoKey)) {
      staging.autos.set(autoKey, {
        key: autoKey,
        clienteKey: cliente.key,
        modelo,
        marca: info.marca,
        tipo: info.tipo,
        descripcionOriginal: vehiculo || "(sin dato)",
      });
    }

    for (const obs of observaciones) cliente.observaciones.add(obs);

    staging.lavados.push({
      linea: nro,
      fecha: fechaFinal,
      clienteKey: cliente.key,
      autoKey,
      servicioPrincipal: servicioParseado.principal,
      addons: servicioParseado.addons,
      servicioOriginal: servicioTexto,
      importeCobrado,
      esCortesia,
      estadoPago,
      formaPago,
      pagos,
      deuda,
      saldoAFavor,
      visitasAnotadas,
      observaciones,
      revision,
    });
  }

  // Orden cronológico para el cálculo de rachas
  staging.lavados.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.linea - b.linea);

  return staging;
}
