-- AlterTable
ALTER TABLE "Lavadero" ADD COLUMN     "colorPrimario" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "tipografiaTexto" TEXT DEFAULT 'inter',
ADD COLUMN     "tipografiaTitulo" TEXT;
