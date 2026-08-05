-- CreateEnum
CREATE TYPE "TipoVehiculo" AS ENUM ('AUTO', 'SUV', 'PICKUP', 'PICKUP_GRANDE', 'UTILITARIO', 'UTILITARIO_GRANDE', 'MOTO', 'MOTORHOME', 'UTV', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoRelacion" AS ENUM ('CLIENTE', 'AMIGO', 'FAMILIAR', 'DESCONOCIDO');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PAGADO', 'PARCIAL', 'PENDIENTE', 'CORTESIA', 'SALDO_APLICADO', 'BONIFICADO', 'SIN_DATO');

-- CreateEnum
CREATE TYPE "FormaPago" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'MIXTO', 'OTRO', 'SIN_DATO');

-- CreateEnum
CREATE TYPE "TipoMovimientoCaja" AS ENUM ('INGRESO', 'EGRESO');

-- CreateEnum
CREATE TYPE "TipoMovimientoCuenta" AS ENUM ('DEUDA', 'PAGO', 'SALDO_A_FAVOR', 'USO_SALDO', 'CORTESIA', 'AJUSTE');

-- CreateEnum
CREATE TYPE "EstadoImportacion" AS ENUM ('APLICADO', 'DESHECHO');

-- AlterTable
ALTER TABLE "Auto" ADD COLUMN     "descripcionOriginal" TEXT,
ADD COLUMN     "importBatchId" TEXT,
ADD COLUMN     "tipo" "TipoVehiculo" NOT NULL DEFAULT 'AUTO',
ALTER COLUMN "patente" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "importBatchId" TEXT,
ADD COLUMN     "nombreOriginal" TEXT,
ADD COLUMN     "origen" TEXT,
ADD COLUMN     "tipoRelacion" "TipoRelacion" NOT NULL DEFAULT 'CLIENTE',
ADD COLUMN     "visitasAnotadas" INTEGER;

-- AlterTable
ALTER TABLE "Lavado" ADD COLUMN     "canceladoAt" TIMESTAMP(3),
ADD COLUMN     "entregadoAt" TIMESTAMP(3),
ADD COLUMN     "estadoPago" "EstadoPago" NOT NULL DEFAULT 'SIN_DATO',
ADD COLUMN     "formaPago" "FormaPago" NOT NULL DEFAULT 'SIN_DATO',
ADD COLUMN     "importBatchId" TEXT,
ADD COLUMN     "importeCobrado" DECIMAL(12,2),
ADD COLUMN     "motivoAjuste" TEXT,
ADD COLUMN     "servicioOriginal" TEXT;

-- CreateTable
CREATE TABLE "PrecioServicio" (
    "id" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "tipoVehiculo" "TipoVehiculo" NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "PrecioServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id" TEXT NOT NULL,
    "lavadoId" TEXT NOT NULL,
    "medio" "FormaPago" NOT NULL,
    "importe" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoCaja" (
    "id" TEXT NOT NULL,
    "lavaderoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tipo" "TipoMovimientoCaja" NOT NULL,
    "categoria" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "conceptoOriginal" TEXT,
    "importe" DECIMAL(12,2) NOT NULL,
    "formaPago" "FormaPago" NOT NULL DEFAULT 'SIN_DATO',
    "clienteId" TEXT,
    "lavadoId" TEXT,
    "observaciones" TEXT,
    "importBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovimientoCaja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoCuenta" (
    "id" TEXT NOT NULL,
    "lavaderoId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tipo" "TipoMovimientoCuenta" NOT NULL,
    "importe" DECIMAL(12,2) NOT NULL,
    "lavadoId" TEXT,
    "observaciones" TEXT,
    "importBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoCuenta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "lavaderoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" "EstadoImportacion" NOT NULL DEFAULT 'APLICADO',
    "resumen" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deshechoAt" TIMESTAMP(3),

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrecioServicio_servicioId_tipoVehiculo_key" ON "PrecioServicio"("servicioId", "tipoVehiculo");

-- CreateIndex
CREATE INDEX "Pago_lavadoId_idx" ON "Pago"("lavadoId");

-- CreateIndex
CREATE INDEX "MovimientoCaja_lavaderoId_fecha_idx" ON "MovimientoCaja"("lavaderoId", "fecha");

-- CreateIndex
CREATE INDEX "MovimientoCuenta_clienteId_fecha_idx" ON "MovimientoCuenta"("clienteId", "fecha");

-- CreateIndex
CREATE INDEX "MovimientoCuenta_lavaderoId_idx" ON "MovimientoCuenta"("lavaderoId");

-- CreateIndex
CREATE INDEX "ImportBatch_lavaderoId_idx" ON "ImportBatch"("lavaderoId");

-- AddForeignKey
ALTER TABLE "PrecioServicio" ADD CONSTRAINT "PrecioServicio_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_lavadoId_fkey" FOREIGN KEY ("lavadoId") REFERENCES "Lavado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_lavaderoId_fkey" FOREIGN KEY ("lavaderoId") REFERENCES "Lavadero"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_lavadoId_fkey" FOREIGN KEY ("lavadoId") REFERENCES "Lavado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCuenta" ADD CONSTRAINT "MovimientoCuenta_lavaderoId_fkey" FOREIGN KEY ("lavaderoId") REFERENCES "Lavadero"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCuenta" ADD CONSTRAINT "MovimientoCuenta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCuenta" ADD CONSTRAINT "MovimientoCuenta_lavadoId_fkey" FOREIGN KEY ("lavadoId") REFERENCES "Lavado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_lavaderoId_fkey" FOREIGN KEY ("lavaderoId") REFERENCES "Lavadero"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
