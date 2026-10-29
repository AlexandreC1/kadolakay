CREATE TABLE security_audit_events (
  id TEXT PRIMARY KEY,
  "actorId" TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action = 'BUSINESS_STATUS_CHANGED'),
  "targetId" TEXT NOT NULL,
  "previousStatus" "BusinessStatus" NOT NULL,
  "nextStatus" "BusinessStatus" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT security_audit_changed CHECK ("previousStatus" <> "nextStatus")
);
CREATE INDEX "security_audit_events_actorId_createdAt_idx" ON security_audit_events("actorId", "createdAt");
CREATE INDEX "security_audit_events_targetId_createdAt_idx" ON security_audit_events("targetId", "createdAt");
CREATE FUNCTION protect_security_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Security audit history is append-only'; END $$;
CREATE TRIGGER security_audit_immutable BEFORE UPDATE OR DELETE ON security_audit_events
  FOR EACH ROW EXECUTE FUNCTION protect_security_audit();
CREATE TRIGGER security_audit_no_truncate BEFORE TRUNCATE ON security_audit_events
  FOR EACH STATEMENT EXECUTE FUNCTION protect_security_audit();
