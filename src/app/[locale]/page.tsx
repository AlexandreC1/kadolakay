import { useTranslations } from "next-intl";
import {
  ArrowRight, Baby, ClipboardList, CreditCard, Gem, Gift, Share2, Smartphone, Sofa, Sparkles, Store, Utensils,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { RegistryTypeIcon } from "@/components/shared/RegistryTypeIcon";
import { LiveRegistryDemo } from "@/components/hero/LiveRegistryDemo";
import { FadeIn, Glow, Reveal } from "@/components/hero/motion";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  furniture: Sofa,
  baby: Baby,
  jewelry: Gem,
  food: Utensils,
};

const STEP_ICONS: LucideIcon[] = [ClipboardList, Smartphone, Gift];

export default function HomePage() {
  const t = useTranslations();

  // "Celebrate together, no matter the distance": the part after the comma
  // gets the gold italic accent. Works for all three languages.
  const [titleLead, titleAccent] = splitAtComma(t("landing.heroTitle"));

  return (
    <div>
      {/* ── Hero (always dark, in every theme) ───────────────────── */}
      <section className="relative isolate overflow-hidden bg-[#070b18] text-white">
        <Glow />
        <div className="mx-auto grid max-w-7xl items-center gap-16 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:px-8 lg:py-32">
          <div className="text-center lg:text-left">
            <FadeIn>
              <span className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-[#f5b83d]" aria-hidden="true" />
                {t("landing.eyebrow")}
              </span>
            </FadeIn>
            <h1 className="text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">
              <Reveal text={titleLead} />
              {titleAccent && (
                <>
                  <br />
                  <Reveal text={titleAccent} delay={0.25} className="italic text-[#f5b83d]" />
                </>
              )}
            </h1>
            <FadeIn delay={0.3}>
              <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-white/65 lg:mx-0">
                {t("landing.heroSubtitle")}
              </p>
              <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link
                  href="/create"
                  className="group inline-flex items-center gap-2 rounded-full bg-[#f5b83d] px-6 py-3.5 font-semibold text-[#070b18] shadow-[0_8px_30px_-8px_rgba(245,184,61,0.55)] transition hover:bg-[#ffc95c]"
                >
                  {t("landing.ctaCreate")}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
                <Link
                  href="/browse"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3.5 font-medium text-white/90 transition hover:bg-white/10"
                >
                  {t("landing.ctaBrowse")}
                </Link>
              </div>
              <dl className="mt-12 flex justify-center gap-10 text-sm lg:justify-start">
                {[
                  ["3", t("landing.statLanguages")],
                  ["4", t("landing.statPayments")],
                  ["0 G", t("landing.statFree")],
                ].map(([value, label]) => (
                  <div key={label} className="flex flex-col-reverse">
                    <dt className="text-white/50">{label}</dt>
                    <dd className="font-display text-2xl font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            </FadeIn>
          </div>

          <LiveRegistryDemo giftedLabel={t("landing.giftReceived")} />
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
                  className="group relative block overflow-hidden rounded-3xl border border-gray-200 bg-surface p-8 transition duration-300 hover:-translate-y-1 hover:border-brand-500/50 hover:shadow-[0_30px_60px_-30px_rgba(59,91,255,0.5)]"
                >
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/15 text-brand-300 transition group-hover:bg-brand-500 group-hover:text-white">
                    <RegistryTypeIcon type={type} className="h-7 w-7" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-10 font-display text-2xl text-gray-900">{title}</h3>
                  <ArrowRight
                    className="absolute right-8 top-8 h-5 w-5 text-gray-400 transition group-hover:translate-x-1 group-hover:text-gold-400"
                    aria-hidden="true"
                  />
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section className="border-y border-gray-200 bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          <FeatureCard icon={Gift} title={t("landing.featureRegistry")} description={t("landing.featureRegistryDesc")} />
          <FeatureCard icon={Share2} title={t("landing.featureShare")} description={t("landing.featureShareDesc")} delay={0.08} />
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
              className="absolute left-[16%] right-[16%] top-8 hidden h-px bg-gradient-to-r from-transparent via-gold-400/50 to-transparent sm:block"
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
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gold-400 px-6 py-3 font-semibold text-brand-950 transition hover:bg-[#ffc95c]"
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
            {Object.entries(CATEGORY_ICONS).map(([cat, Icon], i) => (
              <FadeIn key={cat} delay={i * 0.06}>
                <div className="group rounded-2xl border border-gray-200 bg-surface p-6 text-center transition hover:-translate-y-0.5 hover:border-brand-500/50">
                  <Icon className="mx-auto mb-3 h-8 w-8 text-brand-300 transition group-hover:text-gold-400" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-700">{t(`business.categories.${cat}`)}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA (always dark) ──────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <FadeIn className="relative isolate mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-[#070b18] px-6 py-16 text-center text-white sm:py-20">
          <Glow />
          <h2 className="text-4xl sm:text-5xl">{t("landing.finalTitle")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/65">{t("landing.heroSubtitle")}</p>
          <Link
            href="/create"
            className="group mt-10 inline-flex items-center gap-2 rounded-full bg-[#f5b83d] px-8 py-4 text-lg font-semibold text-[#070b18] transition hover:bg-[#ffc95c]"
          >
            {t("landing.ctaCreate")}
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
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
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/15">
          <Icon className="h-6 w-6 text-brand-300" aria-hidden="true" />
        </div>
        <h3 className="mt-6 text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">{description}</p>
      </div>
    </FadeIn>
  );
}
