"use client";
import { useActionState } from "react";
import {
  confirmAuthenticator,
  type RecoveryResult,
} from "@/actions/workspaces";
import { Link } from "@/i18n/navigation";
export function MfaConfirmForm({
  labels,
}: {
  labels: {
    code: string;
    confirm: string;
    recovery: string;
    failed: string;
    security: string;
  };
}) {
  const [state, submit, pending] = useActionState<RecoveryResult, FormData>(
    confirmAuthenticator,
    { status: "idle" },
  );
  if (state.codes)
    return (
      <section className="foundation-panel" role="status">
        <p>{labels.recovery}</p>
        <ul className="recovery-codes">
          {state.codes.map((code) => (
            <li key={code}>
              <code>{code}</code>
            </li>
          ))}
        </ul>
        <Link href="/security">{labels.security}</Link>
      </section>
    );
  return (
    <form action={submit} className="foundation-form">
      <label htmlFor="mfa-confirm-code">{labels.code}</label>
      <input
        id="mfa-confirm-code"
        name="code"
        required
        pattern="[0-9]{6}"
        minLength={6}
        maxLength={6}
        inputMode="numeric"
        autoComplete="one-time-code"
      />
      {state.status !== "idle" && (
        <p role="alert" className="foundation-error">
          {labels.failed}
        </p>
      )}
      <button type="submit" disabled={pending}>
        {labels.confirm}
      </button>
    </form>
  );
}
