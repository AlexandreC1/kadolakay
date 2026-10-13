/**
 * Structured logger that scrubs PII and secrets (plan §4.5, review L2).
 * Use instead of console.* in server code: log.error("msg", { orderId, err }).
 * Owned by WS8 after Wave 0; Sentry beforeSend should reuse `redact`.
 */
type Level = "debug" | "info" | "warn" | "error";
export type LogContext = Record<string, unknown>;

const SENSITIVE_KEY =
  /(pass(word)?|secret|token|authorization|cookie|api[-_]?key|access[-_]?key|client[-_]?secret|email|phone|whatsapp|buyerName|recipientName|giftMessage|address|^name$|card|cvc|iban|ssn|signature)/i;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Phone-like: 3-3/4-4 digit groups (+509 3712-3456, 555-123-4567). Dates like
// 2026-10-12 and ISO timestamps don't match.
const PHONE_RE = /(?<![\w-])\+?\(?\d{3}\)?[\s.-]?\d{3,4}[\s.-]?\d{4}(?![\w-])/g;
const BEARER_RE = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi;
const SECRET_RE = /\b(sk|rk|pk|whsec|re)_(live|test)?_?[A-Za-z0-9]{8,}\b/g;

export const REDACTED = "[REDACTED]";

export function redactString(s: string): string {
  return s
    .replace(BEARER_RE, `$1 ${REDACTED}`)
    .replace(SECRET_RE, REDACTED)
    .replace(EMAIL_RE, "[EMAIL]")
    .replace(PHONE_RE, "[PHONE]");
}

/** Deep-copy `value` with sensitive keys and PII-looking strings masked. */
export function redact(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (depth > 6) return "[DEPTH]";
  if (typeof value === "string") return redactString(value);
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      // Stack traces stay server-side only and contain code paths, not user data.
      stack: value.stack?.split("\n").slice(0, 8).map(redactString).join("\n"),
      ...(typeof (value as unknown as { code?: unknown }).code === "string"
        ? { code: (value as unknown as { code: string }).code }
        : {}),
    };
  }
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1, seen));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = SENSITIVE_KEY.test(k) ? REDACTED : redact(v, depth + 1, seen);
  }
  return out;
}

function emit(level: Level, message: string, ctx?: LogContext) {
  if (level === "debug" && process.env.NODE_ENV === "production") return;
  const line = {
    level,
    msg: redactString(message),
    time: new Date().toISOString(),
    ...(ctx ? (redact(ctx) as LogContext) : {}),
  };
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  fn(JSON.stringify(line));
}

export const log = {
  debug: (m: string, c?: LogContext) => emit("debug", m, c),
  info: (m: string, c?: LogContext) => emit("info", m, c),
  warn: (m: string, c?: LogContext) => emit("warn", m, c),
  error: (m: string, c?: LogContext) => emit("error", m, c),
};
