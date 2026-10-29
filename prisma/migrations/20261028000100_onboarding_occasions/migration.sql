-- Additive only: preserve existing accounts, registries and order history.
ALTER TYPE "RegistryType" ADD VALUE IF NOT EXISTS 'CHRISTMAS';
ALTER TYPE "RegistryType" ADD VALUE IF NOT EXISTS 'SHOPPING';
ALTER TYPE "RegistryType" ADD VALUE IF NOT EXISTS 'OTHER';
ALTER TABLE "users"
  ADD COLUMN "onboardingStep" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3),
  ADD COLUMN "onboardingDeferredAt" TIMESTAMP(3);
ALTER TABLE "users" ADD CONSTRAINT "users_onboarding_step_check" CHECK ("onboardingStep" BETWEEN 0 AND 2);
