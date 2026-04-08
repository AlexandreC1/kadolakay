import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import Hero3DLazy from "@/components/hero/Hero3DLazy";

export default function HomePage() {
  const t = useTranslations();

  return (
    <div>
      {/* ── Hero Section ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950">
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Gradient orbs */}
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-yellow-500/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-sm text-amber-200">
              <span className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              {t("common.appName")} — Haiti + Dyaspora
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">
              {t("landing.heroTitle")}
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-amber-100/80 sm:text-xl leading-relaxed lg:mx-0 mx-auto">
              {t("landing.heroSubtitle")}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-4">
              <Link href="/create">
                <Button variant="gold" size="xl" className="shadow-lg shadow-amber-900/50 text-base px-8">
                  {t("landing.ctaCreate")}
                </Button>
              </Link>
              <Link href="/browse">
                <Button
                  variant="outline"
                  size="xl"
                  className="border-amber-400/30 text-amber-100 hover:bg-amber-400/10 hover:text-white text-base"
                >
                  {t("landing.ctaBrowse")}
                </Button>
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap items-center lg:justify-start justify-center gap-6 text-amber-300/60 text-sm">
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                Gratis pou kreye
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                MonCash + Natcash + Stripe
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                Kreyòl, Fransè, English
              </span>
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
            <RegistryTypeCard
              emoji="👶"
              title={t("registry.babyShower")}
              gradient="from-pink-50 to-rose-50"
              border="border-pink-200"
            />
            <RegistryTypeCard
              emoji="💍"
              title={t("registry.wedding")}
              gradient="from-violet-50 to-purple-50"
              border="border-violet-200"
            />
            <RegistryTypeCard
              emoji="🎂"
              title={t("registry.birthday")}
              gradient="from-blue-50 to-cyan-50"
              border="border-blue-200"
            />
          </div>
        </div>
      </section>

      {/* ── Features Grid ────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<GiftIcon />}
              title={t("landing.featureRegistry")}
              description={t("landing.featureRegistryDesc")}
            />
            <FeatureCard
              icon={<ShareIcon />}
              title={t("landing.featureShare")}
              description={t("landing.featureShareDesc")}
            />
            <FeatureCard
              icon={<StoreIcon />}
              title={t("landing.featureLocal")}
              description={t("landing.featureLocalDesc")}
            />
            <FeatureCard
              icon={<PaymentIcon />}
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
              icon="📝"
            />
            <StepCard
              number="2"
              title={t("landing.step2Title")}
              description={t("landing.step2Desc")}
              icon="📱"
            />
            <StepCard
              number="3"
              title={t("landing.step3Title")}
              description={t("landing.step3Desc")}
              icon="🎁"
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
            <PaymentBadge name="MonCash" flag="🇭🇹" desc="Mobile money" />
            <PaymentBadge name="Natcash" flag="🇭🇹" desc="NATCOM" />
            <PaymentBadge name="Stripe" flag="🌍" desc="Kat kredi" />
            <PaymentBadge name="PayPal" flag="🌍" desc="Dyaspora" />
          </div>
        </div>
      </section>

      {/* ── For Businesses ───────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700 mb-4">
                🏪 {t("business.browse")}
              </div>
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
              {["furniture", "baby", "jewelry", "food"].map((cat) => (
                <div key={cat} className="rounded-xl bg-gray-50 p-6 text-center">
                  <span className="text-3xl block mb-2">
                    {cat === "furniture" ? "🪑" : cat === "baby" ? "🍼" : cat === "jewelry" ? "💎" : "🍲"}
                  </span>
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
      <section className="py-16 sm:py-24 bg-gradient-to-br from-amber-800 to-amber-950">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            {t("landing.step1Title")}
          </h2>
          <p className="mt-4 text-lg text-amber-100/80">
            {t("landing.heroSubtitle")}
          </p>
          <div className="mt-8">
            <Link href="/create">
              <Button variant="gold" size="xl" className="shadow-lg shadow-amber-900/50 text-base px-10">
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

function RegistryTypeCard({ emoji, title, gradient, border }: {
  emoji: string; title: string; gradient: string; border: string;
}) {
  return (
    <Link href="/create">
      <div className={`rounded-2xl border ${border} bg-gradient-to-br ${gradient} p-8 text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer`}>
        <span className="text-5xl block mb-4">{emoji}</span>
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      </div>
    </Link>
  );
}

function FeatureCard({ icon, title, description }: {
  icon: React.ReactNode; title: string; description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({ number, title, description, icon }: {
  number: string; title: string; description: string; icon: string;
}) {
  return (
    <div className="text-center relative">
      {/* Connector line (hidden on mobile) */}
      {number !== "3" && (
        <div className="hidden sm:block absolute top-7 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-amber-300 to-amber-100" />
      )}
      <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-600 text-white text-xl font-bold shadow-lg shadow-amber-600/30">
        {number}
      </div>
      <span className="text-3xl block mt-4">{icon}</span>
      <h3 className="mt-3 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">{description}</p>
    </div>
  );
}

function PaymentBadge({ name, flag, desc }: { name: string; flag: string; desc: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 text-center hover:shadow-sm transition-shadow">
      <span className="text-2xl block mb-1">{flag}</span>
      <p className="font-semibold text-gray-900 text-sm">{name}</p>
      <p className="text-xs text-gray-500">{desc}</p>
    </div>
  );
}

/* ── Icons ───────────────────────────────────────────────────── */

function GiftIcon() {
  return (
    <svg className="h-7 w-7 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg className="h-7 w-7 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg className="h-7 w-7 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016A3.001 3.001 0 0021 9.349m-18 0V4.125C3 3.504 3.504 3 4.125 3h15.75C20.496 3 21 3.504 21 4.125v5.224" />
    </svg>
  );
}

function PaymentIcon() {
  return (
    <svg className="h-7 w-7 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  );
}
