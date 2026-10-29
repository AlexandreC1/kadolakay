type Outcome = "ok" | "denied" | "failed";
const events = new Set(["authorization_denied", "business_review", "rate_limiter_unavailable", "checkout_failed", "webhook_processing", "payment_reconciliation", "session_revocation"]);
export type OperationalEvent = "authorization_denied" | "business_review" | "rate_limiter_unavailable" | "checkout_failed" | "webhook_processing" | "payment_reconciliation" | "session_revocation";
/** Explicit allowlist: never serialize exceptions, request bodies, identities or tokens. */
export function recordOperationalEvent(event: OperationalEvent, fields: { outcome: Outcome; durationMs?: number; count?: number }) {
  if (!events.has(event) || !["ok", "denied", "failed"].includes(fields.outcome)) return;
  const record = {
    timestamp: new Date().toISOString(), event, outcome: fields.outcome,
    ...(Number.isFinite(fields.durationMs) ? { durationMs: Math.min(3600000, Math.max(0, Math.round(fields.durationMs!))) } : {}),
    ...(Number.isSafeInteger(fields.count) && fields.count! >= 0 ? { count: Math.min(1000000, fields.count!) } : {}),
  };
  try { (fields.outcome === "ok" ? console.info : console.warn)(JSON.stringify(record)); } catch { /* Logging must not roll back committed work. */ }
}
