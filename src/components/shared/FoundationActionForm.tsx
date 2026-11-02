"use client";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
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
    reasons?: Record<string, string>;
    saved: string;
    failed: string;
    premiumInactive: string;
    saving: string;
    invalidDetails: string;
    mfaRequired: string;
  };
  label: string;
  children: ReactNode;
}) {
  const [state, submit, pending] = useActionState<FoundationResult, FormData>(
    action,
    { status: "idle" },
  );
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef<[string, FormDataEntryValue][]>([]);
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.status === "saved") {
      submitted.current = [];
      for (const input of Array.from(
        formRef.current?.querySelectorAll<HTMLInputElement>(
          'input[type="password"],input[autocomplete="one-time-code"]',
        ) || [],
      ))
        input.value = "";
    }
    if (state.status !== "idle" && state.status !== "saved") {
      for (const element of Array.from(formRef.current?.elements || [])) {
        if (
          !(
            element instanceof HTMLInputElement ||
            element instanceof HTMLSelectElement ||
            element instanceof HTMLTextAreaElement
          ) ||
          !element.name ||
          (element instanceof HTMLInputElement &&
            ["hidden", "file", "submit"].includes(element.type))
        )
          continue;
        const values = submitted.current
          .filter(([key]) => key === element.name)
          .map(([, value]) => String(value));
        if (
          element instanceof HTMLInputElement &&
          ["checkbox", "radio"].includes(element.type)
        )
          element.checked = values.includes(element.value);
        else if (values.length) element.value = values[0];
      }
      feedback.current?.focus();
    }
  }, [state]);
  return (
    <form
      ref={formRef}
      onReset={(event) => event.preventDefault()}
      onSubmit={(event) => {
        submitted.current = Array.from(
          new FormData(event.currentTarget).entries(),
        );
      }}
      action={submit}
      className="foundation-form"
      aria-label={label}
    >
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
          {state.reason && c.reasons?.[state.reason] ? (
            c.reasons[state.reason]
          ) : state.status === "mfa" ? (
            <Link href="/security">{c.mfaRequired}</Link>
          ) : state.status === "saved" ? (
            c.saved
          ) : state.status === "premium" ? (
            c.premiumInactive
          ) : state.status === "invalid" ? (
            c.invalidDetails
          ) : (
            c.failed
          )}
        </p>
      )}
      <button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? c.saving : label}
      </button>
    </form>
  );
}
