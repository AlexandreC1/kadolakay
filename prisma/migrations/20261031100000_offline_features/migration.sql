-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mfaLastCounter" BIGINT NOT NULL DEFAULT -1,
ADD COLUMN     "mfaSecret" TEXT,
ADD COLUMN     "recoveryHashes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "suspendedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "registries" ADD COLUMN     "kind" VARCHAR(30) NOT NULL DEFAULT 'SELF',
ADD COLUMN     "recipientMessage" VARCHAR(1000),
ADD COLUMN     "recipientName" VARCHAR(100),
ADD COLUMN     "searchable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "visibility" VARCHAR(20) NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "fulfillmentPolicy" VARCHAR(2000);

-- CreateTable
CREATE TABLE "device_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" VARCHAR(80) NOT NULL DEFAULT 'Browser session',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "mfaVerifiedUntil" TIMESTAMP(3),

    CONSTRAINT "device_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_enrollments" (
    "userId" TEXT NOT NULL,
    "encryptedSecret" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mfa_enrollments_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "operation_audit_events" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" VARCHAR(60) NOT NULL,
    "entityType" VARCHAR(30) NOT NULL,
    "targetId" TEXT NOT NULL,
    "previousValue" VARCHAR(100),
    "nextValue" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operation_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_media" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "alt" VARCHAR(200) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_fulfillments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "state" VARCHAR(30) NOT NULL DEFAULT 'NEW',
    "method" VARCHAR(20) NOT NULL DEFAULT 'PICKUP',
    "instructions" VARCHAR(1000),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_fulfillments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_requests" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "state" VARCHAR(30) NOT NULL DEFAULT 'REQUESTED',
    "reason" VARCHAR(1000) NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season_campaigns" (
    "id" TEXT NOT NULL,
    "titleEN" VARCHAR(120) NOT NULL,
    "titleFR" VARCHAR(120) NOT NULL,
    "titleHT" VARCHAR(120) NOT NULL,
    "season" VARCHAR(20) NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "occasion" VARCHAR(20) NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "season_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL DEFAULT 'site',
    "seasonalEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "device_sessions_userId_expiresAt_idx" ON "device_sessions"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "operation_audit_events_createdAt_id_idx" ON "operation_audit_events"("createdAt", "id");

-- CreateIndex
CREATE INDEX "operation_audit_events_targetId_createdAt_idx" ON "operation_audit_events"("targetId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "product_media_productId_position_key" ON "product_media"("productId", "position");

-- CreateIndex
CREATE INDEX "merchant_fulfillments_businessId_state_updatedAt_idx" ON "merchant_fulfillments"("businessId", "state", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_fulfillments_orderId_businessId_key" ON "merchant_fulfillments"("orderId", "businessId");

-- CreateIndex
CREATE INDEX "refund_requests_businessId_state_createdAt_idx" ON "refund_requests"("businessId", "state", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "refund_requests_orderId_businessId_key" ON "refund_requests"("orderId", "businessId");

-- CreateIndex
CREATE INDEX "season_campaigns_enabled_startsAt_endsAt_priority_idx" ON "season_campaigns"("enabled", "startsAt", "endsAt", "priority");

-- CreateIndex
CREATE INDEX "registries_status_visibility_searchable_title_id_idx" ON "registries"("status", "visibility", "searchable", "title", "id");

-- CreateIndex
CREATE INDEX "registries_userId_kind_updatedAt_idx" ON "registries"("userId", "kind", "updatedAt");

-- AddForeignKey
ALTER TABLE "device_sessions" ADD CONSTRAINT "device_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_enrollments" ADD CONSTRAINT "mfa_enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_fulfillments" ADD CONSTRAINT "merchant_fulfillments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_fulfillments" ADD CONSTRAINT "merchant_fulfillments_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve legacy private/protected behavior; discovery always starts opt-in.
UPDATE registries SET visibility = 'PRIVATE' WHERE "isPublic" = false;
UPDATE registries SET visibility = 'PROTECTED' WHERE password IS NOT NULL;
ALTER TABLE registries ADD CONSTRAINT registry_kind_allowed CHECK (kind IN ('SELF','BASKET_PERSONAL','BASKET_SHARED'));
ALTER TABLE registries ADD CONSTRAINT registry_visibility_allowed CHECK (visibility IN ('PUBLIC','UNLISTED','PRIVATE','PROTECTED'));
ALTER TABLE registries ADD CONSTRAINT protected_registry_password CHECK (visibility <> 'PROTECTED' OR password IS NOT NULL);
ALTER TABLE registries ADD CONSTRAINT searchable_registry_public CHECK (NOT searchable OR (visibility = 'PUBLIC' AND "isPublic" = true AND kind <> 'BASKET_PERSONAL'));
ALTER TABLE users ADD CONSTRAINT mfa_counter_valid CHECK ("mfaLastCounter" >= -1);
ALTER TABLE device_sessions ADD CONSTRAINT device_expiry_valid CHECK ("expiresAt" > "createdAt" AND ("mfaVerifiedUntil" IS NULL OR "mfaVerifiedUntil" <= "expiresAt"));
ALTER TABLE product_media ADD CONSTRAINT media_position_valid CHECK (position BETWEEN 0 AND 7);
ALTER TABLE merchant_fulfillments ADD CONSTRAINT fulfillment_state_valid CHECK (state IN ('NEW','ACCEPTED','PREPARING','READY','SHIPPED','DELIVERED'));
ALTER TABLE merchant_fulfillments ADD CONSTRAINT fulfillment_method_valid CHECK (method IN ('PICKUP','DELIVERY'));
ALTER TABLE refund_requests ADD CONSTRAINT refund_request_state_valid CHECK (state IN ('REQUESTED','ACCEPTED','DECLINED','WITHDRAWN'));
ALTER TABLE refund_requests ADD CONSTRAINT refund_request_money_valid CHECK ("amountMinor" > 0 AND currency IN ('USD','HTG'));
ALTER TABLE refund_requests ADD CONSTRAINT refund_request_kind_valid CHECK (kind IN ('CANCELLATION','REFUND'));
ALTER TABLE season_campaigns ADD CONSTRAINT campaign_valid CHECK ("endsAt" > "startsAt" AND priority BETWEEN 0 AND 100 AND season IN ('everyday','valentine','christmas','independence','flag','vertieres') AND kind IN ('GIFTING','COMMEMORATION'));
ALTER TABLE site_settings ADD CONSTRAINT one_site_settings CHECK (id = 'site');
CREATE TRIGGER operation_audit_immutable BEFORE UPDATE OR DELETE ON operation_audit_events FOR EACH ROW EXECUTE FUNCTION protect_security_audit();
CREATE TRIGGER operation_audit_no_truncate BEFORE TRUNCATE ON operation_audit_events FOR EACH STATEMENT EXECUTE FUNCTION protect_security_audit();
