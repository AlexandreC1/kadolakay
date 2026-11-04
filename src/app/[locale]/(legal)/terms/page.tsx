import { getLocale, getTranslations } from "next-intl/server";
import { termsCopy } from "@/lib/legal-copy";
import { LegalPage } from "../LegalPage";

export async function generateMetadata() {
  return { title: termsCopy(await getLocale()).title };
}

export default async function TermsPage() {
  const locale = await getLocale();
  const t = await getTranslations("footer");
  return <LegalPage doc={termsCopy(locale)} locale={locale} eyebrow={t("terms")} />;
}
