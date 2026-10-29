"use client";

import { useTranslations } from "next-intl";
import { signOutEverywhere } from "@/actions/user";
import { useSafeMutation } from "@/components/shared/useSafeMutation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SessionSecurityForm() {
  const t = useTranslations("settings");
  const { pending, status, run } = useSafeMutation();
  async function submit(formData: FormData) { await run(() => signOutEverywhere(formData)); }
  return (
    <Card className="mt-8">
      <CardHeader><CardTitle className="text-lg">{t("sessionSecurity")}</CardTitle></CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-gray-700">{t("signOutEverywhereDescription")}</p>
        <form action={submit} aria-label={t("sessionSecurity")}>
          {status === "error" && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">{t("signOutEverywhereFailed")}</p>}
          <Button type="submit" variant="outline" disabled={pending}>{pending ? t("signingOut") : t("signOutEverywhere")}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
