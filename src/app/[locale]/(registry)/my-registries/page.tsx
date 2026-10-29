import { getLocale, getTranslations } from "next-intl/server";
import { formatEventDate } from "@/lib/event-date";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMyRegistries } from "@/actions/registry";
import { Link } from "@/i18n/navigation";
import { RegistryProgress } from "@/components/registry/RegistryProgress";
import { wishlistCopy } from "@/lib/wishlist-copy";

export default async function MyRegistriesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/my-registries");
  const t = await getTranslations(), locale = await getLocale(), c = wishlistCopy(locale);
  const registries = await getMyRegistries();
  return <div className="wishlists-page">
    <header className="wishlists-heading"><div><p className="wishlist-eyebrow">Bayou</p><h1>{c.ownerTitle}</h1><p>{c.ownerIntro}</p></div><Link href="/create" className="wishlists-create">{c.create}</Link></header>
    {!registries.length ? <div className="wishlist-empty"><h2>{c.emptyOwner}</h2><p>{c.emptyOwnerText}</p></div> : <div className="wishlists-grid">{registries.map(registry => <article className="wishlist-owner-card" key={registry.id}>
      <div className="wishlist-owner-meta"><span>{t(`registry.${registry.status.toLowerCase()}`)}</span>{registry.eventDate && <time dateTime={registry.eventDate.toISOString()}>{formatEventDate(registry.eventDate, locale)}</time>}</div>
      <h2>{registry.title}</h2>
      <RegistryProgress items={registry.items} locale={locale} compact />
      <div className="wishlist-owner-actions"><Link href={`/r/${registry.slug}/edit`} className="wishlists-manage">{c.manage}</Link>{registry.canView && <Link href={`/r/${registry.slug}`}>{c.view}</Link>}</div>
    </article>)}</div>}
  </div>;
}
