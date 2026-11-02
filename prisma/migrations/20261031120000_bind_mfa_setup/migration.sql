-- Existing unbound enrollment attempts become unusable and must restart.
ALTER TABLE "mfa_enrollments" ADD COLUMN "deviceId" VARCHAR(100) NOT NULL DEFAULT '';
