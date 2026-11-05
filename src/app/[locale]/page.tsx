import { useTranslations } from "next-intl";
import {
  ClipboardList, CreditCard, Gift, Link2, ListChecks, Smartphone, Store,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LiveRegistryDemo } from "@/components/hero/LiveRegistryDemo";
import { FadeIn, Reveal } from "@/components/hero/motion";

const STEP_ICONS: LucideIcon[] = [ClipboardList, Smartphone, Gift];

export default function HomePage() {
  const t = useTranslations();

  // Keep the full heading in one solid text color.
  const [titleLead, titleAccent] = splitAtComma(t("landing.heroTitle"));

  return (
    <div>
      {/* ── Hero (always dark, in every theme) ───────────────────── */}
      <section className="relative isolate overflow-hidden bg-transparent text-gray-900">

        <div className="mx-auto grid max-w-7xl items-center gap-16 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:px-8 lg:py-32">
          <div className="text-center lg:text-left">
            <h1 className="text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">
              <Reveal text={titleLead} />
              {titleAccent && (
                <>
                  <br />
                  <Reveal text={titleAccent} delay={0.25} className="text-gray-900" />
                </>
              )}
            </h1>
            <FadeIn delay={0.3}>
              <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-gray-600 lg:mx-0">
                {t("landing.heroSubtitle")}
              </p>
              <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link
                  href="/create"
                  className="group inline-flex items-center gap-2 rounded-full bg-[var(--brand-accent)] px-6 py-3.5 font-semibold text-[#102e29] shadow-[0_8px_30px_-8px_rgba(94,234,212,0.2)] transition hover:bg-[var(--brand-action-hover)]"
                >
                  {t("landing.ctaCreate")}
                </Link>
                <Link
                  href="/browse"
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-accent)] px-6 py-3.5 font-semibold text-[#102e29] transition hover:bg-[var(--brand-action-hover)]"
                >
                  {t("landing.ctaBrowse")}
                </Link>
              </div>
            </FadeIn>
          </div>

          <LiveRegistryDemo giftedLabel={t("landing.giftReceived")} exampleLabel={t("landing.exampleRegistry")} />
        </div>
      </section>

      {/* ── Registry Types ───────────────────────────────────────── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn className="mb-12 text-center">
            <h2 className="text-4xl text-gray-900 sm:text-5xl">{t("registry.registryTypes")}</h2>
          </FadeIn>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {[
              ["BABY_SHOWER", t("registry.babyShower")],
              ["WEDDING", t("registry.wedding")],
              ["BIRTHDAY", t("registry.birthday")],
            ].map(([type, title], i) => (
              <FadeIn key={type} delay={i * 0.08}>
                <Link
                  href="/create"
                  className="group relative block overflow-hidden rounded-3xl border border-gray-200 bg-surface p-8 transition duration-300 hover:-translate-y-1 hover:border-brand-500/50 hover:shadow-lg"
                >
                  <h3 className="font-display text-2xl text-gray-900">{title}</h3>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section className="border-y border-gray-200 bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          <FeatureCard icon={ListChecks} title={t("landing.featureRegistry")} description={t("landing.featureRegistryDesc")} />
          <FeatureCard icon={Link2} title={t("landing.featureShare")} description={t("landing.featureShareDesc")} delay={0.08} />
          <FeatureCard icon={Store} title={t("landing.featureLocal")} description={t("landing.featureLocalDesc")} delay={0.16} />
          <FeatureCard icon={CreditCard} title={t("landing.featurePayment")} description={t("landing.featurePaymentDesc")} delay={0.24} />
        </div>
      </section>

      {/* ── How it Works ─────────────────────────────────────────── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-center text-4xl text-gray-900 sm:text-5xl">{t("landing.howItWorksTitle")}</h2>
          </FadeIn>
          <div className="relative mt-16 grid grid-cols-1 gap-12 sm:grid-cols-3">
            <div
              aria-hidden="true"
              className="absolute left-[16%] right-[16%] top-8 hidden h-px bg-gray-200 sm:block"
            />
            {([1, 2, 3] as const).map((n, i) => {
              const StepIcon = STEP_ICONS[i];
              return (
                <FadeIn key={n} delay={i * 0.12} className="relative text-center">
                  <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-full border border-gold-400/40 bg-night">
                    <StepIcon className="h-6 w-6 text-gold-400" aria-hidden="true" />
                    <span className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-gold-400 font-display text-sm font-semibold text-brand-950">
                      {n}
                    </span>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-gray-900">{t(`landing.step${n}Title`)}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-gray-500">{t(`landing.step${n}Desc`)}</p>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Payment Methods ──────────────────────────────────────── */}
      <section className="pb-20 sm:pb-28">
        <FadeIn className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-3xl text-gray-900 sm:text-4xl">{t("landing.featurePayment")}</h2>
          <p className="mx-auto mb-10 max-w-xl text-gray-500">{t("landing.featurePaymentDesc")}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["MonCash", "Mobile money"],
              ["Natcash", "NATCOM"],
              ["Stripe", "Visa · Mastercard"],
              ["PayPal", "Dyaspora"],
            ].map(([name, desc]) => (
              <div key={name} className="rounded-2xl border border-gray-200 bg-surface px-4 py-5 transition hover:border-gold-400/50">
                <p className="font-display text-xl text-gray-900">{name}</p>
                <p className="mt-1 text-xs text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ── For Businesses ───────────────────────────────────────── */}
      <section className="border-t border-gray-200 bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <FadeIn>
            <p className="mb-4 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-gold-300">
              <Store className="h-4 w-4" aria-hidden="true" />
              {t("business.browse")}
            </p>
            <h2 className="text-4xl text-gray-900 sm:text-5xl">{t("business.signup")}</h2>
            <p className="mt-4 text-lg leading-relaxed text-gray-500">{t("business.browseDesc")}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/business/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gold-400 px-6 py-3 font-semibold text-brand-950 transition hover:bg-[var(--brand-action-hover)]"
              >
                {t("business.signup")}
              </Link>
              <Link
                href="/browse"
                className="inline-flex items-center justify-center rounded-full border border-gray-300 px-6 py-3 font-medium text-gray-900 transition hover:bg-gray-100"
              >
                {t("business.browse")}
              </Link>
            </div>
          </FadeIn>
          <div className="grid grid-cols-2 gap-4">
            {["furniture", "baby", "jewelry", "food"].map((cat, i) => (
              <FadeIn key={cat} delay={i * 0.06}>
                <div className="group rounded-2xl border border-gray-200 bg-surface p-6 text-center transition hover:-translate-y-0.5 hover:border-brand-500/50">
                  <p className="text-sm font-medium text-gray-700">{t(`business.categories.${cat}`)}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA (always dark) ──────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <FadeIn className="relative isolate mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-transparent px-6 py-16 text-center text-gray-900 sm:py-20">

          <h2 className="text-4xl sm:text-5xl">{t("landing.finalTitle")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">{t("landing.heroSubtitle")}</p>
          <Link
            href="/create"
            className="group mt-10 inline-flex items-center gap-2 rounded-full bg-[var(--brand-accent)] px-8 py-4 text-lg font-semibold text-[#102e29] transition hover:bg-[var(--brand-action-hover)]"
          >
            {t("landing.ctaCreate")}
          </Link>
        </FadeIn>
      </section>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────── */

function splitAtComma(text: string): [string, string] {
  const i = text.indexOf(",");
  return i === -1 ? [text, ""] : [text.slice(0, i + 1), text.slice(i + 1).trim()];
}

function FeatureCard({ icon: Icon, title, description, delay = 0 }: {
  icon: LucideIcon; title: string; description: string; delay?: number;
}) {
  return (
    <FadeIn delay={delay} className="h-full">
      <div className="h-full rounded-3xl border border-gray-200 bg-surface p-7 transition hover:border-brand-500/40">
        <Icon className="h-7 w-7 text-gray-700" strokeWidth={1.5} aria-hidden="true" />
        <h3 className="mt-6 text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">{description}</p>
      </div>
    </FadeIn>
  );
}
