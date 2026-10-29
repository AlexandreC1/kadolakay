# Bayou access control and observability

Updated 29 October 2026. This describes the implementation on codex/ship-ready-mvp, not a production security certification. The application-level security policy is enforced in server code; PostgreSQL row-level security is not configured.

## Roles and record ownership

| Actor | Capabilities | Additional boundary |
| --- | --- | --- |
| Guest | Open eligible public lists/catalog and initiate or resume eligible checkout when explicitly enabled | Cannot change registries or merchants. A checkout capability is not an account session. |
| USER | Own profile, onboarding, own registries and gifts; apply for a business | No product-management or admin-review permission. Strict input excludes role assignment. |
| BUSINESS_OWNER | Member tasks plus product management | Must own the business/product. A suspended business cannot mutate products. |
| ADMIN | Member tasks and business approval/suspension | Registry and product mutations still use ownership rules. Upload code has an explicit admin exception for non-avatar contexts. No blanket ownership bypass is inferred. |
| SUPERADMIN | Platform owner with all currently implemented administrative capabilities | Assigned through an explicit audited operator bootstrap. No public role promotion, broad ownership bypass or unimplemented control is implied. |

`src/services/permissions.ts` is the deny-by-default mutation permission matrix. `requireActor` resolves the session, reloads the user role from PostgreSQL, checks the named permission and applies a shared rate limit. Unknown actions and inherited object property names are denied. The role is not taken from a form, browser storage or a stale session claim.

Permissions and ownership are separate. Product/registry services must still constrain the record by owner. Product mutations check the merchant role again under a user-row lock inside the transaction. Business review also locks and reloads the administrator before changing a merchant. A concurrent demotion must be observed before a blocked decision proceeds.

Proxy checks only guide navigation. Sensitive pages/actions must verify permissions on the server. Existing administrator page queries still explicitly reload the database role; not every read route is routed through the shared mutation helper. SUPERADMIN is the platform-owner role; a company staff-membership model and web-based role-management workflow remain unfinished. Initial owner assignment uses the reviewed operator procedure below; there is no public role-promotion form.

### Owner initialization

Verify the exact existing account through its genuine signed-in session before running `npm run admin:bootstrap -- --user-id USER_ID --confirm`. The CLI loads local environment configuration, requires a loopback database and a linked provider account, serializes initialization and refuses a different owner after one has been initialized. It creates no new account and contains no email/account allowlist. Re-running for the same owner is a no-op. Identity-specific grants are database changes, never committed migrations or seed defaults.

The role and an append-only UserRoleAuditEvent commit together. This thirteenth model stores previous/next role, actor/target IDs, timestamp and the fixed OPERATOR_BOOTSTRAP source, without contact or token data. Ordinary update/delete/truncate are guarded. This is currently a bootstrap-grant log, not complete tracking of every possible DBA role change. Database owners can still alter guards. Higher roles are preserved if the owner registers a business.

The local owner's Google account has been initialized at the owner's explicit request. That does not grant a hosted account: each database has its own users and needs separately verified operator initialization. There is no runtime auto-promotion and no production override flag in the local helper. Administration is linked from the desktop/mobile account navigation. MFA and a complete owner control panel are still separate work.

## Administrative evidence

`SecurityAuditEvent` is the twelfth Prisma model. A merchant status change and its audit row commit in the same PostgreSQL transaction. An audit row stores the actor ID, business ID, fixed action, prior/next status and creation timestamp. It contains no email, patente, access token, form body or free-form provider payload.

Repeated requests for an already-current status produce no extra transition. Concurrent approvals produce one actual change and one audit row. PostgreSQL triggers reject UPDATE, DELETE and TRUNCATE against the audit table through ordinary application operations. There are no cascading user/business foreign keys that silently erase the evidence.

This is append-only application history, not external tamper-proof storage. A database owner can alter/drop triggers. Production should use a least-privilege application role, separate migration/admin credentials and restricted audit-reader access. Backup and retention policies remain operator decisions. This table currently audits business status changes only, not every login, product edit, payment or refund. An admin audit viewer/export is not yet implemented.

Example for an authorized database operator, never a public endpoint:

```sql
SELECT id, "actorId", "targetId", action,
       "previousStatus", "nextStatus", "createdAt"
FROM security_audit_events
ORDER BY "createdAt" DESC
LIMIT 50;
```

## Observability coverage

| Signal | What exists | What is still unverified |
| --- | --- | --- |
| Health | `/api/health` performs a DB ping and returns 200/503, no-store, build/environment and latency | External uptime checks, alert recipients, hosted failure behavior and complete dependency readiness |
| Operational logs | JSON events for access denials, review outcomes, limiter failure, unexpected checkout failure, webhook processing and reconciliation | Hosted log retention/search, dashboards, alert routing and delivered alerts |
| Audit evidence | Transactional append-only merchant-review history | Full security/financial event coverage, retention policy and operator UI |
| Sentry errors | Optional server/client initialization and Next request-error hook with outbound filtering | Local DSNs are absent; actual service delivery and alert notification have not been demonstrated |
| Performance and replay | Explicitly disabled for now | Reviewed trace/span privacy policy, controlled sampling, distributed traces and measured hosted SLOs |

New operational log records accept only approved event/outcome labels, timestamp and bounded numeric duration/count. They never serialize request objects or exceptions. Missing/outage Redis reports are limited to once per minute per process so a failure does not create unbounded log volume. Logging failure cannot roll back a committed business decision.

Sentry uses the existing collection opt-outs plus a final `beforeSend` allowlist. It drops raw error values/messages, user information, request URLs/headers/bodies, breadcrumbs, tags, extra data and contexts. Retained diagnostics are a validated event ID/time, generic error category, bounded line/column numbers and allowlisted application filenames. Unrecognized filenames become `application.js`. This deliberately provides coarse diagnostics, not unrestricted production payloads. Session replay, breadcrumbs and performance transactions remain off until their privacy behavior is reviewed.

Monitoring initialization/capture failures are contained and report static failure codes. The app does not require a configured Sentry account to run. Existing log sites outside the new helper still need continued review; do not claim all third-party logging has been redacted.

## Enable and verify monitoring

1. Configure an owner-approved Sentry project through host secret settings. Keep any source-map upload auth token private. The browser DSN is intentionally public configuration, not an authentication secret.
2. Verify the host's CSP, monitoring tunnel, serverless lifetime and source-map handling. Error telemetry can contain diagnostic code locations even with this conservative filter; restrict project access and retention.
3. Send controlled client/server errors in staging with a stubbed fake email and token. Confirm delivery, grouping and absence of those sentinel values in the received event. Do not add a public production crash endpoint.
4. Configure alert recipients and prove a notification reaches them. A successful SDK initialization is not proof of an alert.
5. Configure external uptime checks and test DB and Redis outages independently. The proxy may return 503 before the health route when the required limiter is unavailable; that is expected fail-closed behavior.
6. Establish baselines for latency, error rate, DB connections/lock waits, webhook failures, reconciliation backlog and budget use. The current JSON logs can support counts and durations, but no hosted metrics collector/dashboard is claimed.

Suggested alert rules must be tuned against the actual schedule and traffic: unexpected limiter unavailability in production; repeated webhook processing failures; reconciliation failures; sustained health failures; pool saturation; and pending orders older than provider expiry plus the configured reconciliation interval and a reviewed grace period. Do not assume a five-minute scheduler or a 45-minute hold alarm when the selected free host may reconcile hourly.

## Remaining security work

- Hosted OAuth/cookie/origin/IP-header validation, including a second real sign-in method.
- MFA/step-up policy for administrators and a review of approval conflicts such as self-review.
- Per-device session revocation and a documented secret-rotation/incident process.
- Provider-token field encryption and retention if tokens are kept for provider API access.
- Upload and object-storage policy validation on the real host.
- Signed-event inbox, reliable notification outbox and audited refund/settlement operations.
- Tested backup restoration, least-privilege database users and verified alert delivery.
- Continued ownership tests on every new feature, especially shared baskets and future company staff roles.

New checkout remains disabled. No external monitoring account, paid service, alert destination or live payment was configured by this change.
