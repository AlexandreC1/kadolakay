"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitContact } from "@/actions/user";

export function ContactForm() {
  const t = useTranslations("contact");
  const [status, setStatus] = useState<"idle" | "sent" | "INVALID" | "RATE_LIMITED">("idle");
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await submitContact(formData);
      setStatus(res.ok ? "sent" : res.error);
    });
  }

  if (status === "sent") return <p className="rounded-lg bg-green-500/15 p-4 text-green-300" role="status">{t("sent")}</p>;

  return (
    <form action={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="c-name" className="block text-sm font-medium text-gray-700">{t("name")}</label>
        <Input id="c-name" name="name" required maxLength={100} autoComplete="name" />
      </div>
      <div>
        <label htmlFor="c-email" className="block text-sm font-medium text-gray-700">{t("email")}</label>
        <Input id="c-email" name="email" type="email" required maxLength={254} autoComplete="email" />
      </div>
      <div>
        <label htmlFor="c-message" className="block text-sm font-medium text-gray-700">{t("message")}</label>
        <textarea
          id="c-message"
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      {/* Honeypot: hidden from people, filled by bots. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {status === "INVALID" && <p className="text-sm text-red-300" role="alert">{t("invalid")}</p>}
      {status === "RATE_LIMITED" && <p className="text-sm text-red-300" role="alert">{t("rateLimited")}</p>}
      <Button type="submit" variant="gold" disabled={pending}>{pending ? "…" : t("send")}</Button>
    </form>
  );
}
