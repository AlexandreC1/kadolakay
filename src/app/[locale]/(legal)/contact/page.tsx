import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ContactForm } from "./ContactForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact");
  return { title: `${t("title")} — KadoLakay` };
}

export default async function ContactPage() {
  const t = await getTranslations("contact");
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">{t("title")}</h1>
      <p className="mt-2 mb-8 text-gray-600">
        {t("intro")}{" "}
        <a href="mailto:support@kadolakay.com" className="text-amber-700 underline">support@kadolakay.com</a>
      </p>
      <ContactForm />
    </div>
  );
}
