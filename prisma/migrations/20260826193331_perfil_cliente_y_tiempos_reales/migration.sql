-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "perfil" TEXT,
ADD COLUMN     "preferencias" TEXT,
ADD COLUMN     "queValora" TEXT;

-- AlterTable
ALTER TABLE "Lavado" ADD COLUMN     "tiemposReales" BOOLEAN NOT NULL DEFAULT true;

-- Los lavados importados del registro histórico tienen tiempos fabricados
-- (inicio = llegada, fin = llegada + duración estimada): quedan fuera de las
-- métricas de demora, pero siguen contando para facturación y puntos.
UPDATE "Lavado" SET "tiemposReales" = false WHERE "importBatchId" IS NOT NULL;
