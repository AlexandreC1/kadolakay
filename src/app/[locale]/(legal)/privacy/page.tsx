import { getLocale, getTranslations } from "next-intl/server";
import { privacyCopy } from "@/lib/legal-copy";
import { LegalPage } from "../LegalPage";

export async function generateMetadata() {
  return { title: privacyCopy(await getLocale()).title };
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  const t = await getTranslations("footer");
  return <LegalPage doc={privacyCopy(locale)} locale={locale} eyebrow={t("privacy")} />;
}
