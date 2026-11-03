import { getLocale } from "next-intl/server";
import { Baby, Cake, ChevronRight, Gift, HeartHandshake, ListChecks, Plus, ShoppingBag, Store, TreePine, Wallet } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { homeCopy } from "@/lib/home-copy";
import { occasionLabel, occasionTypes } from "@/lib/occasions";
import { formatEventDate } from "@/lib/event-date";
import { daysUntil, listCopy } from "@/lib/wishlist-copy";
import { ListFinder } from "@/components/home/ListFinder";
import { GiftShelf } from "@/components/home/GiftShelf";
import { WovenProgress, strandsFor } from "@/components/registry/WovenProgress";
import { PageTransition } from "@/components/shared/PageTransition";
import styles from "@/components/home/home.module.css";

const icons = { BIRTHDAY: Cake, BABY_SHOWER: Baby, WEDDING: HeartHandshake, CHRISTMAS: TreePine, SHOPPING: ShoppingBag, OTHER: Gift };

/** Home is the app's first screen: find a list, start one, pick up your own, or browse real gifts. */
export default async function HomePage() {
  const locale = await getLocale();
  const c = homeCopy(locale), l = listCopy(locale);
  const session = await auth();
  const lists = session?.user?.id
    ? await db.registry
        .findMany({
          where: { userId: session.user.id, status: { not: "ARCHIVED" } },
          orderBy: { updatedAt: "desc" },
          take: 4,
          select: { id: true, slug: true, title: true, type: true, eventDate: true, items: { select: { quantity: true, fulfilledQty: true, reservedQty: true } } },
        })
        .catch(() => [])
    : null;
  const quick = [
    { href: "/create", icon: Plus, label: c.qaNew, hint: c.qaNewHint, primary: true },
    { href: "/registries", icon: ListChecks, label: c.qaPublic, hint: c.qaPublicHint },
    { href: "/discover", icon: Wallet, label: c.qaBudget, hint: c.qaBudgetHint },
    { href: "/browse", icon: Store, label: c.qaShops, hint: c.qaShopsHint },
  ];
  return (
    <PageTransition>
      <div className={styles.home}>
        <section className={styles.top} aria-labelledby="home-heading">
          <h1 id="home-heading" className={styles.title}>
            {c.appTitle}
          </h1>
          <ListFinder locale={locale} />
        </section>

        <nav className={styles.quick} aria-label={c.quick}>
          {quick.map(({ href, icon: Icon, label, hint, primary }, i) => (
            <Link key={href} href={href} className={styles.quickItem} data-primary={primary || undefined} style={{ ["--i" as string]: i }}>
              <span className={styles.quickIcon}>
                <Icon size={20} strokeWidth={2} aria-hidden="true" />
              </span>
              <span className={styles.quickText}>
                <strong>{label}</strong>
                <span>{hint}</span>
              </span>
            </Link>
          ))}
        </nav>

        {lists && (
          <section className={styles.section} aria-labelledby="my-lists">
            <div className={styles.sectionHead}>
              <h2 id="my-lists">{c.yourLists}</h2>
              {lists.length > 0 && <Link href="/dashboard">{c.seeAll}</Link>}
            </div>
            {lists.length ? (
              <ul className={styles.rows}>
                {lists.map((list) => {
                  const strands = strandsFor(list.items);
                  const given = strands.filter((s) => s === "confirmed").length;
                  const Icon = icons[list.type as keyof typeof icons] ?? Gift;
                  const days = list.eventDate ? daysUntil(list.eventDate) : null;
                  return (
                    <li key={list.id}>
                      <Link href={`/r/${list.slug}/edit`} className={styles.row} transitionTypes={["nav-forward"]}>
                        <span className={styles.rowIcon}>
                          <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
                        </span>
                        <span className={styles.rowMain}>
                          <strong>{list.title}</strong>
                          <span>
                            {occasionLabel(list.type, locale)}
                            {list.eventDate ? `, ${formatEventDate(list.eventDate, locale)}` : ""}
                            {days != null && days >= 0 ? ` (${l.countdown(days).toLowerCase()})` : ""}
                          </span>
                        </span>
                        {strands.length > 0 && (
                          <span className={styles.rowProgress}>
                            <WovenProgress strands={strands} label={l.weave(given, strands.length)} />
                            <span>{c.listProgress(given, strands.length)}</span>
                          </span>
                        )}
                        <ChevronRight className={styles.chevron} size={18} aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className={styles.emptyRow}>
                <div>
                  <strong>{c.noListsTitle}</strong>
                  <p>{c.noListsText}</p>
                </div>
                <Link href="/create" className={styles.buttonPrimary}>
                  {c.qaNew}
                </Link>
              </div>
            )}
          </section>
        )}

        <section className={styles.section} aria-labelledby="start-heading">
          <div className={styles.sectionHead}>
            <h2 id="start-heading">{c.startTitle}</h2>
          </div>
          <ul className={styles.occasions}>
            {occasionTypes.map((type) => {
              const Icon = icons[type];
              return (
                <li key={type}>
                  <Link href={`/create?type=${type}`}>
                    <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                    {occasionLabel(type, locale)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <GiftShelf locale={locale} />

        <Link href="/business" className={styles.merchantRow}>
          <span className={styles.rowIcon}>
            <Store size={19} strokeWidth={1.9} aria-hidden="true" />
          </span>
          <span className={styles.rowMain}>
            <strong>{c.merchantRow}</strong>
            <span>{c.merchantText}</span>
          </span>
          <ChevronRight className={styles.chevron} size={18} aria-hidden="true" />
        </Link>
      </div>
    </PageTransition>
  );
}
