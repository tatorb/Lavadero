-- CreateEnum
CREATE TYPE "RolStaff" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'OPERATIVO');

-- CreateEnum
CREATE TYPE "EstadoTurno" AS ENUM ('PENDIENTE', 'CONFIRMADO', 'CANCELADO', 'COMPLETADO');

-- CreateEnum
CREATE TYPE "OrigenTurno" AS ENUM ('CLIENTE', 'ADMIN');

-- CreateEnum
CREATE TYPE "TipoServicio" AS ENUM ('PRINCIPAL', 'ADDON');

-- CreateEnum
CREATE TYPE "TipoMovimientoPuntos" AS ENUM ('LAVADO', 'BONUS_RACHA', 'AJUSTE_MANUAL');

-- CreateEnum
CREATE TYPE "TipoDescuento" AS ENUM ('PORCENTAJE', 'MONTO_FIJO');

-- CreateTable
CREATE TABLE "Lavadero" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "rachaVentanaDias" INTEGER NOT NULL DEFAULT 14,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lavadero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "RolStaff" NOT NULL,
    "lavaderoId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "lavaderoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "passwordHash" TEXT,
    "detalles" TEXT,
    "vinculadoConId" TEXT,
    "puntosTotal" INTEGER NOT NULL DEFAULT 0,
    "rachaActual" INTEGER NOT NULL DEFAULT 0,
    "mejorRacha" INTEGER NOT NULL DEFAULT 0,
    "ultimaVisita" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auto" (
    "id" TEXT NOT NULL,
    "lavaderoId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "patente" TEXT NOT NULL,
    "color" TEXT,
    "detalles" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Auto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servicio" (
    "id" TEXT NOT NULL,
    "lavaderoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio" DECIMAL(12,2) NOT NULL,
    "tipo" "TipoServicio" NOT NULL DEFAULT 'PRINCIPAL',
    "duracionMin" INTEGER NOT NULL DEFAULT 30,
    "puntos" INTEGER NOT NULL DEFAULT 10,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turno" (
    "id" TEXT NOT NULL,
    "lavaderoId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "autoId" TEXT,
    "servicioId" TEXT NOT NULL,
    "fechaReserva" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaTurno" TIMESTAMP(3) NOT NULL,
    "duracionMin" INTEGER NOT NULL DEFAULT 30,
    "estado" "EstadoTurno" NOT NULL DEFAULT 'PENDIENTE',
    "origen" "OrigenTurno" NOT NULL DEFAULT 'CLIENTE',
    "detalle" TEXT,
    "canceladoMotivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Turno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TurnoAddon" (
    "turnoId" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,

    CONSTRAINT "TurnoAddon_pkey" PRIMARY KEY ("turnoId","servicioId")
);

-- CreateTable
CREATE TABLE "Lavado" (
    "id" TEXT NOT NULL,
    "lavaderoId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "autoId" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "turnoId" TEXT,
    "llegadaAt" TIMESTAMP(3) NOT NULL,
    "inicioAt" TIMESTAMP(3),
    "finAt" TIMESTAMP(3),
    "detalles" TEXT,
    "precioFinal" DECIMAL(12,2),
    "puntosOtorgados" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lavado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LavadoAddon" (
    "lavadoId" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "LavadoAddon_pkey" PRIMARY KEY ("lavadoId","servicioId")
);

-- CreateTable
CREATE TABLE "ReglaFranja" (
    "id" TEXT NOT NULL,
    "lavaderoId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" INTEGER NOT NULL,
    "horaFin" INTEGER NOT NULL,
    "slotMin" INTEGER NOT NULL DEFAULT 30,
    "capacidadPorSlot" INTEGER NOT NULL DEFAULT 1,
    "confirmacionAuto" BOOLEAN NOT NULL DEFAULT false,
    "anticipacionMinHoras" INTEGER,
    "anticipacionMaxDias" INTEGER,
    "prioridad" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReglaFranja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nivel" (
    "id" TEXT NOT NULL,
    "lavaderoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "puntosMin" INTEGER NOT NULL,
    "color" TEXT,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Nivel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PuntosMovimiento" (
    "id" TEXT NOT NULL,
    "lavaderoId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "lavadoId" TEXT,
    "tipo" "TipoMovimientoPuntos" NOT NULL,
    "puntos" INTEGER NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PuntosMovimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Descuento" (
    "id" TEXT NOT NULL,
    "lavaderoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" "TipoDescuento" NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "nivelId" TEXT,
    "validoDesde" TIMESTAMP(3),
    "validoHasta" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Descuento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lavadero_slug_key" ON "Lavadero"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_lavaderoId_idx" ON "Usuario"("lavaderoId");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_vinculadoConId_key" ON "Cliente"("vinculadoConId");

-- CreateIndex
CREATE INDEX "Cliente_lavaderoId_nombre_idx" ON "Cliente"("lavaderoId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_lavaderoId_email_key" ON "Cliente"("lavaderoId", "email");

-- CreateIndex
CREATE INDEX "Auto_clienteId_idx" ON "Auto"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "Auto_lavaderoId_patente_key" ON "Auto"("lavaderoId", "patente");

-- CreateIndex
CREATE INDEX "Servicio_lavaderoId_activo_idx" ON "Servicio"("lavaderoId", "activo");

-- CreateIndex
CREATE INDEX "Turno_lavaderoId_fechaTurno_idx" ON "Turno"("lavaderoId", "fechaTurno");

-- CreateIndex
CREATE INDEX "Turno_lavaderoId_estado_idx" ON "Turno"("lavaderoId", "estado");

-- CreateIndex
CREATE INDEX "Turno_clienteId_idx" ON "Turno"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "Lavado_turnoId_key" ON "Lavado"("turnoId");

-- CreateIndex
CREATE INDEX "Lavado_lavaderoId_llegadaAt_idx" ON "Lavado"("lavaderoId", "llegadaAt");

-- CreateIndex
CREATE INDEX "Lavado_clienteId_idx" ON "Lavado"("clienteId");

-- CreateIndex
CREATE INDEX "ReglaFranja_lavaderoId_diaSemana_activo_idx" ON "ReglaFranja"("lavaderoId", "diaSemana", "activo");

-- CreateIndex
CREATE INDEX "Nivel_lavaderoId_puntosMin_idx" ON "Nivel"("lavaderoId", "puntosMin");

-- CreateIndex
CREATE UNIQUE INDEX "Nivel_lavaderoId_orden_key" ON "Nivel"("lavaderoId", "orden");

-- CreateIndex
CREATE INDEX "PuntosMovimiento_clienteId_createdAt_idx" ON "PuntosMovimiento"("clienteId", "createdAt");

-- CreateIndex
CREATE INDEX "PuntosMovimiento_lavaderoId_idx" ON "PuntosMovimiento"("lavaderoId");

-- CreateIndex
CREATE INDEX "Descuento_lavaderoId_activo_idx" ON "Descuento"("lavaderoId", "activo");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_lavaderoId_fkey" FOREIGN KEY ("lavaderoId") REFERENCES "Lavadero"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_lavaderoId_fkey" FOREIGN KEY ("lavaderoId") REFERENCES "Lavadero"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_vinculadoConId_fkey" FOREIGN KEY ("vinculadoConId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auto" ADD CONSTRAINT "Auto_lavaderoId_fkey" FOREIGN KEY ("lavaderoId") REFERENCES "Lavadero"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auto" ADD CONSTRAINT "Auto_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_lavaderoId_fkey" FOREIGN KEY ("lavaderoId") REFERENCES "Lavadero"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_lavaderoId_fkey" FOREIGN KEY ("lavaderoId") REFERENCES "Lavadero"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_autoId_fkey" FOREIGN KEY ("autoId") REFERENCES "Auto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnoAddon" ADD CONSTRAINT "TurnoAddon_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnoAddon" ADD CONSTRAINT "TurnoAddon_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lavado" ADD CONSTRAINT "Lavado_lavaderoId_fkey" FOREIGN KEY ("lavaderoId") REFERENCES "Lavadero"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lavado" ADD CONSTRAINT "Lavado_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lavado" ADD CONSTRAINT "Lavado_autoId_fkey" FOREIGN KEY ("autoId") REFERENCES "Auto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lavado" ADD CONSTRAINT "Lavado_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lavado" ADD CONSTRAINT "Lavado_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LavadoAddon" ADD CONSTRAINT "LavadoAddon_lavadoId_fkey" FOREIGN KEY ("lavadoId") REFERENCES "Lavado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LavadoAddon" ADD CONSTRAINT "LavadoAddon_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReglaFranja" ADD CONSTRAINT "ReglaFranja_lavaderoId_fkey" FOREIGN KEY ("lavaderoId") REFERENCES "Lavadero"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nivel" ADD CONSTRAINT "Nivel_lavaderoId_fkey" FOREIGN KEY ("lavaderoId") REFERENCES "Lavadero"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuntosMovimiento" ADD CONSTRAINT "PuntosMovimiento_lavaderoId_fkey" FOREIGN KEY ("lavaderoId") REFERENCES "Lavadero"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuntosMovimiento" ADD CONSTRAINT "PuntosMovimiento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Descuento" ADD CONSTRAINT "Descuento_lavaderoId_fkey" FOREIGN KEY ("lavaderoId") REFERENCES "Lavadero"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Descuento" ADD CONSTRAINT "Descuento_nivelId_fkey" FOREIGN KEY ("nivelId") REFERENCES "Nivel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
