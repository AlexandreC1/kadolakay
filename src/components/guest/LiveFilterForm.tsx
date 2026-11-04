"use client";
import { useRef, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import styles from "./guest.module.css";

/**
 * A plain GET form that also updates results as the visitor changes a filter.
 * Without script it submits normally. With script, choices apply at once and typing
 * applies after a short pause; the update runs in a transition so results glide
 * into place instead of the page reloading.
 */
export function LiveFilterForm({ action, children, pendingLabel, className }: { action: string; children: ReactNode; pendingLabel: string; className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const timer = useRef<number | undefined>(undefined);
  const form = useRef<HTMLFormElement>(null);

  function apply() {
    const el = form.current;
    if (!el || !el.checkValidity()) return;
    const params = new URLSearchParams();
    new FormData(el).forEach((value, key) => {
      if (typeof value === "string" && value.trim()) params.set(key, value.trim());
    });
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${action}?${qs}` : action, { scroll: false }));
  }

  return (
    <form
      ref={form}
      method="get"
      action={action}
      className={className ?? styles.filters}
      onChange={(event) => {
        window.clearTimeout(timer.current);
        const typing = event.target instanceof HTMLInputElement && (event.target.type === "text" || event.target.type === "search" || event.target.type === "number");
        timer.current = window.setTimeout(apply, typing ? 450 : 0);
      }}
      onSubmit={(event) => {
        event.preventDefault();
        window.clearTimeout(timer.current);
        if (form.current?.reportValidity()) apply();
      }}
    >
      {children}
      <span className={styles.pending} role="status" aria-live="polite" hidden={!pending}>
        {pendingLabel}
      </span>
    </form>
  );
}
