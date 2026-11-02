-- Additive: count wrong authenticator codes and lock step-up after too many.
ALTER TABLE "users" ADD COLUMN "mfaFailedAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "mfaFailureWindowStart" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "mfaLockedUntil" TIMESTAMP(3);
ALTER TABLE "users" ADD CONSTRAINT mfa_failed_attempts_valid CHECK ("mfaFailedAttempts" >= 0);
