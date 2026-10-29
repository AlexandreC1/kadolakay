"use client";

import { useRef, useState } from "react";
import { performMutation } from "@/lib/client-mutation";
import { useTranslations } from "next-intl";

/** Never render raw server exception messages or swallow framework redirects. */
export function useSafeMutation() {
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<"error" | "success" | null>(null);
  async function run(operation: () => Promise<unknown>): Promise<boolean> {
    if (lock.current) return false;
    lock.current = true;
    setPending(true);
    setStatus(null);
    try {
      const ok = await performMutation(operation);
      setStatus(ok ? "success" : "error");
      return ok;    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return { pending, status, run };
}

export function MutationFeedback({ status }: { status: "error" | "success" | null }) {
  const t = useTranslations("common");
  if (!status) return null;
  return <p role={status === "error" ? "alert" : "status"} className={`rounded-lg border p-4 text-sm ${status === "error" ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}>{t(status === "error" ? "saveFailed" : "saved")}</p>;
}
