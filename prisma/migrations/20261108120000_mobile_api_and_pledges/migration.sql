-- Mobile app: bearer-token sessions, emailed sign-in codes, and "I'll give this" pledges.
-- Additive only. Existing rows, sessions and orders are not changed.

-- AlterTable
ALTER TABLE "registries" ADD COLUMN     "place" VARCHAR(80);

-- CreateTable
CREATE TABLE "mobile_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "label" VARCHAR(80) NOT NULL DEFAULT 'Bayou app',
    "sessionVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "mobile_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_sign_in_codes" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "codeHash" CHAR(64) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_sign_in_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_pledges" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "registryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "message" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "gift_pledges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mobile_sessions_tokenHash_key" ON "mobile_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "mobile_sessions_userId_expiresAt_idx" ON "mobile_sessions"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "email_sign_in_codes_email_createdAt_idx" ON "email_sign_in_codes"("email", "createdAt");

-- CreateIndex
CREATE INDEX "gift_pledges_itemId_idx" ON "gift_pledges"("itemId");

-- CreateIndex
CREATE INDEX "gift_pledges_registryId_idx" ON "gift_pledges"("registryId");

-- CreateIndex
CREATE INDEX "gift_pledges_userId_createdAt_idx" ON "gift_pledges"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "mobile_sessions" ADD CONSTRAINT "mobile_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_pledges" ADD CONSTRAINT "gift_pledges_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "registry_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_pledges" ADD CONSTRAINT "gift_pledges_registryId_fkey" FOREIGN KEY ("registryId") REFERENCES "registries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_pledges" ADD CONSTRAINT "gift_pledges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- A pledge always promises at least one unit; codes cannot go negative on attempts.
ALTER TABLE "gift_pledges" ADD CONSTRAINT gift_pledge_quantity_positive CHECK ("quantity" BETWEEN 1 AND 1000);
ALTER TABLE "email_sign_in_codes" ADD CONSTRAINT email_code_attempts_valid CHECK ("attempts" >= 0);
