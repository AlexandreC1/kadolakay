/**
 * Shared Server Action result shape (plan §4.5).
 *
 * Server Actions return this instead of throwing raw Errors, so the client
 * gets a stable, non-leaky error code and an optional field name for forms.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: ActionErrorCode | string; field?: string };

export type ActionErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_INPUT"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "PROVIDER_ERROR"
  | "INTERNAL";

export function ok(): ActionResult<void>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | void> {
  return { ok: true, data: data as T };
}

export function fail(error: ActionErrorCode | string, field?: string): ActionResult<never> {
  return field ? { ok: false, error, field } : { ok: false, error };
}

/** Thrown by the auth helpers; mapped to ActionResult by `toActionError`. */
export class AuthError extends Error {
  constructor(public readonly code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND") {
    super(code);
    this.name = "AuthError";
  }
}

/** Typed error for expected failures inside actions (bad input, conflict...). */
export class ActionError extends Error {
  constructor(public readonly code: ActionErrorCode, public readonly field?: string) {
    super(code);
    this.name = "ActionError";
  }
}

/**
 * Convert any thrown value into an ActionResult without leaking internals.
 * Unknown errors become "INTERNAL"; callers should log them first.
 */
export function toActionError(err: unknown): ActionResult<never> {
  if (err instanceof AuthError) return fail(err.code);
  if (err instanceof ActionError) return fail(err.code, err.field);
  if (isZodError(err)) {
    const first = err.issues[0];
    return fail("INVALID_INPUT", first?.path?.length ? String(first.path[0]) : undefined);
  }
  return fail("INTERNAL");
}

function isZodError(err: unknown): err is { issues: { path: PropertyKey[] }[] } {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: string }).name === "ZodError" &&
    Array.isArray((err as { issues?: unknown }).issues)
  );
}

/** Wrap an action body so every throw becomes a typed ActionResult. */
export async function runAction<T>(
  fn: () => Promise<T>,
  onUnexpected?: (err: unknown) => void
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    const res = toActionError(err);
    if (!res.ok && res.error === "INTERNAL") onUnexpected?.(err);
    return res;
  }
}
