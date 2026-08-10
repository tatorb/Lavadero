-- CreateEnum
CREATE TYPE "TipoVinculo" AS ENUM ('PAREJA', 'FAMILIAR', 'AMIGO');

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "vinculoTipo" "TipoVinculo";
