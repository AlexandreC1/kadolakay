import { useTranslations } from "next-intl";
import { Baby, Check, CreditCard, Gem, Gift, Share2, Sofa, Store, Utensils, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { RegistryTypeIcon } from "@/components/shared/RegistryTypeIcon";
import Hero3DLazy from "@/components/hero/Hero3DLazy";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  furniture: Sofa,
  baby: Baby,
  jewelry: Gem,
  food: Utensils,
};

export default function HomePage() {
  const t = useTranslations();

  return (
    <div>
      {/* ── Hero Section ─────────────────────────────────────────── */}
      <section className="bg-brand-950">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <div className="text-center lg:text-left">
            <p className="mb-6 text-sm font-semibold uppercase tracking-wider text-gold-400">
              Haiti + Dyaspora
            </p>

            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">
              {t("landing.heroTitle")}
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-brand-100 sm:text-xl leading-relaxed lg:mx-0 mx-auto">
              {t("landing.heroSubtitle")}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-4">
              <Link href="/create">
                <Button variant="gold" size="xl" className="text-base px-8">
                  {t("landing.ctaCreate")}
                </Button>
              </Link>
              <Link href="/browse">
                <Button
                  variant="outline"
                  size="xl"
                  className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white text-base"
                >
                  {t("landing.ctaBrowse")}
                </Button>
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap items-center lg:justify-start justify-center gap-6 text-brand-200 text-sm">
              {["Gratis pou kreye", "MonCash + Natcash + Stripe", "Kreyòl, Fransè, English"].map((label) => (
                <span key={label} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-gold-400" aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
            </div>

            {/* 3D parallax hero — mouse-driven, GPU-accelerated, ~50KB lazy chunk */}
            <div className="relative">
              <Hero3DLazy />
            </div>
          </div>
        </div>
      </section>

      {/* ── Registry Types ───────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              {t("registry.registryTypes")}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <RegistryTypeCard type="BABY_SHOWER" title={t("registry.babyShower")} />
            <RegistryTypeCard type="WEDDING" title={t("registry.wedding")} />
            <RegistryTypeCard type="BIRTHDAY" title={t("registry.birthday")} />
          </div>
        </div>
      </section>

      {/* ── Features Grid ────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={Gift}
              title={t("landing.featureRegistry")}
              description={t("landing.featureRegistryDesc")}
            />
            <FeatureCard
              icon={Share2}
              title={t("landing.featureShare")}
              description={t("landing.featureShareDesc")}
            />
            <FeatureCard
              icon={Store}
              title={t("landing.featureLocal")}
              description={t("landing.featureLocalDesc")}
            />
            <FeatureCard
              icon={CreditCard}
              title={t("landing.featurePayment")}
              description={t("landing.featurePaymentDesc")}
            />
          </div>
        </div>
      </section>

      {/* ── How it Works ─────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 sm:text-4xl">
            {t("landing.howItWorksTitle")}
          </h2>

          <div className="mt-16 grid grid-cols-1 gap-12 sm:grid-cols-3">
            <StepCard
              number="1"
              title={t("landing.step1Title")}
              description={t("landing.step1Desc")}
            />
            <StepCard
              number="2"
              title={t("landing.step2Title")}
              description={t("landing.step2Desc")}
            />
            <StepCard
              number="3"
              title={t("landing.step3Title")}
              description={t("landing.step3Desc")}
            />
          </div>
        </div>
      </section>

      {/* ── Payment Methods ──────────────────────────────────────── */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl mb-4">
            {t("landing.featurePayment")}
          </h2>
          <p className="text-gray-600 mb-10 max-w-xl mx-auto">
            {t("landing.featurePaymentDesc")}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <PaymentBadge name="MonCash" desc="Mobile money" />
            <PaymentBadge name="Natcash" desc="NATCOM" />
            <PaymentBadge name="Stripe" desc="Kat kredi" />
            <PaymentBadge name="PayPal" desc="Dyaspora" />
          </div>
        </div>
      </section>

      {/* ── For Businesses ───────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand-700">
                {t("business.browse")}
              </p>
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                {t("business.signup")}
              </h2>
              <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                {t("business.browseDesc")}
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link href="/business/signup">
                  <Button variant="gold">
                    {t("business.signup")}
                  </Button>
                </Link>
                <Link href="/browse">
                  <Button variant="outline">
                    {t("business.browse")}
                  </Button>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(CATEGORY_ICONS).map(([cat, Icon]) => (
                <div key={cat} className="rounded-xl bg-gray-50 p-6 text-center">
                  <Icon className="mx-auto mb-3 h-8 w-8 text-brand-700" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-700">
                    {t(`business.categories.${cat}`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-brand-950">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            {t("landing.step1Title")}
          </h2>
          <p className="mt-4 text-lg text-brand-100">
            {t("landing.heroSubtitle")}
          </p>
          <div className="mt-8">
            <Link href="/create">
              <Button variant="gold" size="xl" className="text-base px-10">
                {t("landing.ctaCreate")}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */

function RegistryTypeCard({ type, title }: { type: string; title: string }) {
  return (
    <Link href="/create">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center transition-colors hover:border-brand-300 hover:bg-brand-50 cursor-pointer">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
          <RegistryTypeIcon type={type} className="h-8 w-8 text-brand-700" />
        </span>
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      </div>
    </Link>
  );
}

function FeatureCard({ icon: Icon, title, description }: {
  icon: LucideIcon; title: string; description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
        <Icon className="h-6 w-6 text-brand-700" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({ number, title, description }: {
  number: string; title: string; description: string;
}) {
  return (
    <div className="text-center relative">
      {/* Connector line (hidden on mobile) */}
      {number !== "3" && (
        <div className="hidden sm:block absolute top-7 left-[60%] w-[80%] h-[2px] bg-gold-200" />
      )}
      <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-white text-xl font-bold">
        {number}
      </div>
      <h3 className="mt-6 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">{description}</p>
    </div>
  );
}

function PaymentBadge({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
      <p className="font-semibold text-gray-900">{name}</p>
      <p className="text-xs text-gray-600">{desc}</p>
    </div>
  );
}
