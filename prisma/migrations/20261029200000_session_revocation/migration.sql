ALTER TABLE users ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD CONSTRAINT users_session_version_nonnegative CHECK ("sessionVersion" >= 0);
CREATE TABLE session_revocation_events (
  id TEXT PRIMARY KEY,
  "actorId" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT session_revocation_self_only CHECK ("actorId" = "targetId")
);
CREATE INDEX "session_revocation_events_targetId_createdAt_idx" ON session_revocation_events("targetId", "createdAt");
CREATE TRIGGER session_revocation_immutable BEFORE UPDATE OR DELETE ON session_revocation_events
  FOR EACH ROW EXECUTE FUNCTION protect_security_audit();
CREATE TRIGGER session_revocation_no_truncate BEFORE TRUNCATE ON session_revocation_events
  FOR EACH STATEMENT EXECUTE FUNCTION protect_security_audit();
