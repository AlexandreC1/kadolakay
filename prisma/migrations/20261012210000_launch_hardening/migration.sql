-- WS0 launch hardening: additive columns/tables/indexes for Waves 1-2.
-- Requires PostgreSQL 13+ (gen_random_uuid). Safe to run on a populated DB.

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'EXPIRED';
ALTER TYPE "OrderStatus" ADD VALUE 'PAYMENT_FAILED';

-- DropIndex
DROP INDEX "registries_slug_idx";

-- DropIndex
DROP INDEX "businesses_slug_idx";

-- DropIndex
DROP INDEX "products_businessId_idx";

-- DropIndex
DROP INDEX "orders_orderNumber_idx";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bannedAt" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
-- Existing rows get a random token; new rows get a cuid from Prisma.
ALTER TABLE "registries" ADD COLUMN     "shareToken" TEXT;
UPDATE "registries" SET "shareToken" = replace(gen_random_uuid()::text, '-', '') WHERE "shareToken" IS NULL;
ALTER TABLE "registries" ALTER COLUMN "shareToken" SET NOT NULL;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "publicToken" TEXT,
ADD COLUMN     "registryId" TEXT;
UPDATE "orders" SET "publicToken" = replace(gen_random_uuid()::text, '-', '') WHERE "publicToken" IS NULL;
ALTER TABLE "orders" ALTER COLUMN "publicToken" SET NOT NULL;
-- Backfill registryId from the order's first item.
UPDATE "orders" o SET "registryId" = sub."registryId"
FROM (
  SELECT DISTINCT ON (oi."orderId") oi."orderId", ri."registryId"
  FROM "order_items" oi JOIN "registry_items" ri ON ri."id" = oi."registryItemId"
  ORDER BY oi."orderId", oi."id"
) sub
WHERE o."id" = sub."orderId" AND o."registryId" IS NULL;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "amountExpected" DECIMAL(12,2),
ADD COLUMN     "manualConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "manualConfirmedById" TEXT,
ADD COLUMN     "manualReference" TEXT,
ADD COLUMN     "providerTxId" TEXT;

-- CreateTable
CREATE TABLE "email_outbox" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ht',
    "payload" JSONB NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "sendAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploads" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "attachedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_outbox_dedupeKey_key" ON "email_outbox"("dedupeKey");

-- CreateIndex
CREATE INDEX "email_outbox_status_sendAfter_idx" ON "email_outbox"("status", "sendAfter");

-- CreateIndex
CREATE INDEX "audit_logs_targetType_targetId_idx" ON "audit_logs"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "uploads_key_key" ON "uploads"("key");

-- CreateIndex
CREATE INDEX "uploads_attachedAt_createdAt_idx" ON "uploads"("attachedAt", "createdAt");

-- CreateIndex
CREATE INDEX "uploads_ownerId_idx" ON "uploads"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "registries_shareToken_key" ON "registries"("shareToken");

-- CreateIndex
CREATE INDEX "registries_status_isPublic_idx" ON "registries"("status", "isPublic");

-- CreateIndex
CREATE INDEX "businesses_status_name_idx" ON "businesses"("status", "name");

-- CreateIndex
CREATE INDEX "products_businessId_inStock_idx" ON "products"("businessId", "inStock");

-- CreateIndex
CREATE UNIQUE INDEX "orders_publicToken_key" ON "orders"("publicToken");

-- CreateIndex
CREATE INDEX "orders_status_createdAt_idx" ON "orders"("status", "createdAt");

-- CreateIndex
CREATE INDEX "orders_registryId_status_createdAt_idx" ON "orders"("registryId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_registryItemId_idx" ON "order_items"("registryItemId");

-- CreateIndex
CREATE INDEX "payments_paypalOrderId_idx" ON "payments"("paypalOrderId");

-- CreateIndex
CREATE INDEX "payments_status_createdAt_idx" ON "payments"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_providerTxId_key" ON "payments"("provider", "providerTxId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_registryId_fkey" FOREIGN KEY ("registryId") REFERENCES "registries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

