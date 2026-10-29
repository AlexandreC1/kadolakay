import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { findPublicBusiness } from "@/services/catalog";
import { catalogCopy } from "@/lib/catalog-copy";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";

export default async function BusinessStorefront({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const business = await findPublicBusiness(slug);
  if (!business) notFound();
  const t = catalogCopy(locale);
  return <div className="mx-auto max-w-6xl px-6 py-12">
    <Link href="/browse" className="text-sm underline underline-offset-4">{t.local}</Link>
    <header className="mt-8 max-w-3xl space-y-4"><p className="text-sm text-[var(--brand-ocean)]">{[business.category, business.city, business.department].filter(Boolean).join(" · ")}</p><h1 className="text-4xl font-bold">{business.name}</h1>{business.description && <p className="text-lg leading-relaxed">{business.description}</p>}</header>
    <h2 className="mt-12 mb-6 text-2xl font-semibold">{t.products}</h2>
    {!business.products.length ? <p>{t.empty}</p> : <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">{business.products.map(product => <article key={product.id} className="space-y-3">
      {product.imageUrl && <img src={product.imageUrl} alt="" className="aspect-square w-full rounded-2xl object-cover" loading="lazy" />}
      <h3 className="text-lg font-semibold"><Link href={`/gifts/${product.id}`} className="underline decoration-slate-300 underline-offset-4">{product.name}</Link></h3>
      <CurrencyDisplay priceHTG={product.priceHTG} priceUSD={product.priceUSD} />
      <Link href={`/gifts/${product.id}`} className="inline-flex min-h-11 items-center rounded-full border border-[var(--brand-ocean)] px-5 text-sm font-semibold text-[var(--brand-ocean)]">{t.detail}</Link>
    </article>)}</div>}
  </div>;
}
