"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { deleteMyAccount, type AccountDeletionState } from "@/actions/user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const initial: AccountDeletionState = { status: "idle" };

export function AccountDataPanel() {
  const t = useTranslations("settings");
  const [state, action, pending] = useActionState(deleteMyAccount, initial);
  const error =
    state.status === "blocked" && state.reason
      ? t(`deleteBlocked_${state.reason}`)
      : state.status === "mismatch"
        ? t("deleteMismatch")
        : state.status === "invalid"
          ? t("deleteInvalid")
          : state.status === "unavailable"
            ? t("deleteUnavailable")
            : null;
  return (
    <Card className="mt-8">
      <CardHeader><CardTitle className="text-lg">{t("yourData")}</CardTitle></CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-gray-700">{t("exportDescription")}</p>
        <a
          href="/api/account/export"
          download
          className="inline-flex h-11 items-center rounded-full border border-gray-300 bg-[var(--brand-surface)] px-5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {t("exportButton")}
        </a>
        <hr className="my-8 border-gray-200" />
        <h3 className="mb-2 text-base font-semibold">{t("deleteTitle")}</h3>
        <p className="mb-4 text-sm text-gray-700">{t("deleteDescription")}</p>
        <form action={action} aria-label={t("deleteTitle")} noValidate>
          {error && (
            <p role="alert" id="delete-account-error" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              {error}
            </p>
          )}
          <label htmlFor="delete-confirmation" className="mb-2 block text-sm font-medium">
            {t("deleteConfirmLabel")}
          </label>
          <input
            id="delete-confirmation"
            name="confirmation"
            type="email"
            autoComplete="off"
            required
            aria-invalid={state.status === "mismatch" || state.status === "invalid"}
            aria-describedby={error ? "delete-account-error" : undefined}
            className="mb-4 h-11 w-full rounded-lg border border-gray-300 bg-[var(--brand-surface)] px-3"
          />
          <Button type="submit" variant="destructive" disabled={pending}>
            {pending ? t("deleting") : t("deleteButton")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
