-- AlterTable
ALTER TABLE "payments" ADD COLUMN "providerEventId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payments_providerEventId_key" ON "payments"("providerEventId");
