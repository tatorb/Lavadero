import type { TipoMovimientoCuenta } from "@prisma/client";

/**
 * Saldo de cuenta corriente de un cliente.
 * Positivo = el cliente tiene saldo a favor; negativo = debe.
 * CORTESIA es informativa y no afecta el saldo; AJUSTE se guarda con signo.
 */
export function calcularSaldo(
  movimientos: Array<{ tipo: TipoMovimientoCuenta; importe: number | { toNumber(): number } }>
): number {
  let saldo = 0;
  for (const m of movimientos) {
    const importe = typeof m.importe === "number" ? m.importe : m.importe.toNumber();
    switch (m.tipo) {
      case "DEUDA":
      case "USO_SALDO":
        saldo -= importe;
        break;
      case "PAGO":
      case "SALDO_A_FAVOR":
        saldo += importe;
        break;
      case "AJUSTE":
        saldo += importe;
        break;
      case "CORTESIA":
        break;
    }
  }
  return saldo;
}

export const TIPO_MOVIMIENTO_CUENTA_LABEL: Record<TipoMovimientoCuenta, string> = {
  DEUDA: "Deuda",
  PAGO: "Pago",
  SALDO_A_FAVOR: "Saldo a favor",
  USO_SALDO: "Uso de saldo",
  CORTESIA: "Cortesía",
  AJUSTE: "Ajuste",
};
