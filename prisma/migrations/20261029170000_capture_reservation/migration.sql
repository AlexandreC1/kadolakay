ALTER TABLE "payments" ADD COLUMN "captureRequestedAt" TIMESTAMP(3);
ALTER TABLE "payments" ADD COLUMN "lastReconciledAt" TIMESTAMP(3);
CREATE INDEX "payments_lastReconciledAt_createdAt_idx" ON "payments"("lastReconciledAt", "createdAt");
