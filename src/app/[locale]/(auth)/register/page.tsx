import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAuthAvailability } from "@/lib/auth-config";
import { LoginForm } from "../login/LoginForm";
import "../login/login.css";

export default async function RegisterPage() {
  const t = await getTranslations("auth");
  return (
    <div className="mx-auto grid min-h-[75vh] max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:gap-24">
      <div className="space-y-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-ocean)]">KadoLakay</p>
        <h1 className="max-w-lg text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{t("signupTitle")}</h1>
        <p className="max-w-md text-lg leading-relaxed text-[var(--brand-muted)]">{t("signupSubtitle")}</p>
        <Link href="/login" className="inline-block text-sm font-semibold text-[var(--brand-ocean)] underline underline-offset-4">{t("hasAccount")}</Link>
      </div>
      <section aria-label={t("signupTitle")} className="w-full max-w-md space-y-7 rounded-2xl border border-[var(--brand-line)] bg-[var(--brand-surface)] p-7 sm:p-9">
        <h2 className="text-xl font-semibold">{t("chooseMethod")}</h2>
        <LoginForm {...getAuthAvailability(process.env)} />
      </section>
    </div>
  );
}
