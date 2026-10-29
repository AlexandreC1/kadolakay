CREATE TABLE user_role_audit_events (
  id TEXT PRIMARY KEY,
  "actorId" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "previousRole" "Role" NOT NULL,
  "nextRole" "Role" NOT NULL,
  source TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT role_bootstrap_grant CHECK (
    "previousRole" <> "nextRole" AND "nextRole" = 'SUPERADMIN'
    AND source = 'OPERATOR_BOOTSTRAP' AND "actorId" = "targetId"
  )
);
CREATE INDEX "user_role_audit_events_targetId_createdAt_idx" ON user_role_audit_events("targetId", "createdAt");
CREATE TRIGGER user_role_audit_immutable BEFORE UPDATE OR DELETE ON user_role_audit_events
  FOR EACH ROW EXECUTE FUNCTION protect_security_audit();
CREATE TRIGGER user_role_audit_no_truncate BEFORE TRUNCATE ON user_role_audit_events
  FOR EACH STATEMENT EXECUTE FUNCTION protect_security_audit();
