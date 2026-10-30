"use client";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import type { FoundationResult } from "@/lib/foundation-result";

export function FoundationActionForm({
  action,
  messages: c,
  label,
  children,
}: {
  action: (
    previous: FoundationResult,
    form: FormData,
  ) => Promise<FoundationResult>;
  messages: {
    saved: string;
    failed: string;
    premiumInactive: string;
    saving: string;
    invalidDetails: string;
  };
  label: string;
  children: ReactNode;
}) {
  const [state, submit, pending] = useActionState<FoundationResult, FormData>(
    action,
    { status: "idle" },
  );
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.status !== "idle" && state.status !== "saved")
      feedback.current?.focus();
  }, [state]);
  return (
    <form action={submit} className="foundation-form" aria-label={label}>
      {children}
      {state.status !== "idle" && (
        <p
          ref={feedback}
          tabIndex={-1}
          role={state.status === "saved" ? "status" : "alert"}
          className={
            state.status === "saved" ? "foundation-success" : "foundation-error"
          }
        >
          {state.status === "saved"
            ? c.saved
            : state.status === "premium"
              ? c.premiumInactive
              : state.status === "invalid"
                ? c.invalidDetails
                : c.failed}
        </p>
      )}
      <button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? c.saving : label}
      </button>
    </form>
  );
}
