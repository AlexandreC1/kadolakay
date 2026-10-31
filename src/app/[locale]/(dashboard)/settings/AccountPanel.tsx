"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteAccount, signOutEverywhere } from "@/actions/user";

export function AccountPanel({ email }: { email: string }) {
  const t = useTranslations("settings.account");
  const locale = useLocale();
  const [confirmEmail, setConfirmEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onDelete(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await deleteAccount(formData);
      if (res && !res.ok) setError(res.error === "CONFIRMATION" ? t("deleteMismatch") : t("deleteBlockedBusiness"));
    });
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <section>
          <h3 className="font-medium text-gray-900">{t("exportTitle")}</h3>
          <p className="text-sm text-gray-500 mb-2">{t("exportDesc")}</p>
          <a
            href={`/${locale}/settings/export`}
            className="inline-block rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t("exportButton")}
          </a>
        </section>

        <section>
          <h3 className="font-medium text-gray-900">{t("signOutAllTitle")}</h3>
          <p className="text-sm text-gray-500 mb-2">{t("signOutAllDesc")}</p>
          <form action={signOutEverywhere}>
            <Button type="submit" variant="outline">{t("signOutAllButton")}</Button>
          </form>
        </section>

        <section className="rounded-lg border border-red-500/30 bg-red-500/15 p-4">
          <h3 className="font-medium text-red-300">{t("deleteTitle")}</h3>
          <p className="text-sm text-red-300 mb-3">{t("deleteDesc")}</p>
          <form action={onDelete} className="space-y-2">
            <label className="block text-sm text-red-300" htmlFor="confirmEmail">
              {t("deleteConfirmLabel", { email })}
            </label>
            <Input
              id="confirmEmail"
              name="confirmEmail"
              type="email"
              autoComplete="off"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
            />
            {error && <p className="text-sm text-red-300" role="alert">{error}</p>}
            <Button
              type="submit"
              variant="destructive"
              disabled={pending || confirmEmail.trim().toLowerCase() !== email.toLowerCase()}
            >
              {pending ? "…" : t("deleteButton")}
            </Button>
          </form>
        </section>
      </CardContent>
    </Card>
  );
}
