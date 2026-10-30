ALTER TABLE registries ADD COLUMN palette VARCHAR(20) NOT NULL DEFAULT 'mint';
ALTER TABLE registries ADD CONSTRAINT registry_palette_allowed CHECK (palette IN ('mint','rose','ocean','gold'));
CREATE TABLE merchant_payment_profiles (
  "businessId" TEXT PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('moncash','natcash','card')),
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE premium_grants (
  "userId" TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE premium_audit_events (
  id TEXT PRIMARY KEY,
  "actorId" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX premium_audit_target_created ON premium_audit_events("targetId", "createdAt");
CREATE TRIGGER premium_audit_immutable BEFORE UPDATE OR DELETE ON premium_audit_events FOR EACH ROW EXECUTE FUNCTION protect_security_audit();
CREATE TRIGGER premium_audit_no_truncate BEFORE TRUNCATE ON premium_audit_events FOR EACH STATEMENT EXECUTE FUNCTION protect_security_audit();
CREATE INDEX products_available_usd ON products("inStock", "priceUSD", id);
CREATE INDEX products_available_htg ON products("inStock", "priceHTG", id);
