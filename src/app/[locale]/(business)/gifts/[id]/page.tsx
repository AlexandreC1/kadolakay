import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { findPublicProduct } from "@/services/catalog";
import { Link } from "@/i18n/navigation";
import { catalogCopy } from "@/lib/catalog-copy";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { AddCatalogGift } from "@/components/registry/AddCatalogGift";

export default async function GiftPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = await params;
  const product = await findPublicProduct(id);
  if (!product) notFound();
  const t = catalogCopy(locale);
  const session = await auth();
  const registries = session?.user?.id ? await db.registry.findMany({ where: { userId: session.user.id, status: { not: "ARCHIVED" } }, select: { id: true, title: true }, take: 50, orderBy: { updatedAt: "desc" } }) : [];
  return <article className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-2">
    <div>{product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="aspect-square w-full rounded-2xl object-cover" /> : <div className="grid aspect-square place-items-center rounded-2xl bg-[var(--brand-sand)] p-8 text-center text-2xl">{product.name}</div>}</div>
    <div className="space-y-6"><Link href={`/businesses/${product.business.slug}`} className="text-sm underline underline-offset-4">{product.business.name}{product.business.city ? ` · ${product.business.city}` : ""}</Link>
      <h1 className="text-4xl font-bold leading-tight">{product.name}</h1>
      <CurrencyDisplay priceHTG={product.priceHTG} priceUSD={product.priceUSD} className="text-2xl" />
      <p className="text-sm font-semibold">{product.inStock ? t.available : t.unavailable}</p>
      {product.description && <p className="leading-relaxed">{product.description}</p>}
      {product.inStock && (session?.user ? registries.length ? <AddCatalogGift productId={product.id} registries={registries} /> : <Link href="/create" className="inline-flex min-h-12 items-center rounded-full bg-[var(--brand-action)] px-6 text-[var(--brand-on-action)]">{t.create}</Link> : <Link href={`/login?callbackUrl=${encodeURIComponent(`/${locale}/gifts/${product.id}`)}`} className="inline-flex min-h-12 items-center rounded-full bg-[var(--brand-action)] px-6 text-[var(--brand-on-action)]">{t.signIn}</Link>)}
      <p className="border-t border-slate-300 pt-5 text-sm leading-relaxed">{t.terms}</p>
    </div>
  </article>;
}
