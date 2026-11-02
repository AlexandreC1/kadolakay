ALTER TABLE orders ADD COLUMN "deliveryContactEncrypted" TEXT;
CREATE INDEX payment_status_currency_created ON payments(status,currency,"createdAt");
ALTER TABLE user_role_audit_events DROP CONSTRAINT role_bootstrap_grant;
ALTER TABLE user_role_audit_events ADD CONSTRAINT role_bootstrap_grant CHECK (
 "previousRole" <> "nextRole" AND (
  (source = 'OPERATOR_BOOTSTRAP' AND "nextRole" = 'SUPERADMIN' AND "actorId" = "targetId") OR
  (source = 'ADMIN_CONSOLE' AND "previousRole" <> 'SUPERADMIN' AND "nextRole" <> 'SUPERADMIN' AND "actorId" <> "targetId")
 )
);
