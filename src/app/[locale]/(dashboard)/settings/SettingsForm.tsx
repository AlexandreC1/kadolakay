"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateProfile } from "@/actions/user";

interface SettingsFormProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    preferredLocale: string;
    image: string | null;
  };
}

export function SettingsForm({ user }: SettingsFormProps) {
  const t = useTranslations();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setMessage(null);
    try {
      await updateProfile(formData);
      setMessage({ type: "success", text: t("common.success") });
    } catch {
      setMessage({ type: "error", text: t("common.error") });
    }
    setPending(false);
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {message && (
        <div
          className={`rounded-lg p-3 text-sm ${
            message.type === "success"
              ? "bg-green-500/15 text-green-300 border border-green-500/30"
              : "bg-red-500/15 text-red-300 border border-red-500/30"
          }`}
        >
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t("settings.profile")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("settings.name")}
            </label>
            <Input name="name" defaultValue={user.name || ""} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("settings.email")}
            </label>
            <Input value={user.email} disabled className="bg-gray-50" />
            <p className="text-xs text-gray-500 mt-1">
              {t("settings.emailHint")}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("settings.phone")}
            </label>
            <Input
              name="phone"
              type="tel"
              defaultValue={user.phone || ""}
              placeholder="+509 ..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t("settings.language")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[
              { code: "ht", label: "Kreyòl Ayisyen" },
              { code: "fr", label: "Français" },
              { code: "en", label: "English" },
            ].map((locale) => (
              <label
                key={locale.code}
                className={`flex items-center gap-2 rounded-lg border-2 p-3 cursor-pointer transition-colors ${
                  user.preferredLocale === locale.code
                    ? "border-gold-500 bg-gold-400/10"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="preferredLocale"
                  value={locale.code}
                  defaultChecked={user.preferredLocale === locale.code}
                  className="sr-only"
                />
                <span className="text-sm font-medium text-gray-900">
                  {locale.label}
                </span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" variant="gold" disabled={pending}>
          {pending ? t("common.loading") : t("common.save")}
        </Button>
      </div>
    </form>
  );
}
