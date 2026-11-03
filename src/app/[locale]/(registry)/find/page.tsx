import { workspaceCopy } from "@/lib/workspace-copy";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Link } from "@/i18n/navigation";
import { registryAddress } from "@/lib/registry-address";
import { finderCopy } from "@/lib/finder-copy";
import { previewSharedRegistry } from "@/services/registry-finder";
import { checkRateLimit } from "@/lib/rate-limit";
import { rateLimitClientKey } from "@/lib/client-ip";
import styles from "./finder.module.css";
import { ChevronRight, ListChecks, Plus, Search } from "lucide-react";
import { ListFinder } from "@/components/home/ListFinder";
import { PageTransition } from "@/components/shared/PageTransition";
import { guestCopy } from "@/lib/guest-copy";
import guest from "@/components/guest/guest.module.css";
import rows from "@/components/guest/rows.module.css";
import { formatEventDate } from "@/lib/event-date";
import { RegistryQrScanner } from "@/components/registry/RegistryQrScanner";
import { occasionLabel } from "@/lib/occasions";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "same-origin",
};

export default async function FindRegistry({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const [{ locale }, { q }] = await Promise.all([params, searchParams]);
  const c = finderCopy(locale);
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  let result: Awaited<ReturnType<typeof previewSharedRegistry>> | undefined;
  let error: string | undefined;
  if (q !== undefined) {
    if (typeof q !== "string" || !registryAddress(q, base)) error = c.invalid;
    else {
      try {
        const limit = await checkRateLimit(
          "general",
          `registry-finder:${rateLimitClientKey(await headers())}`,
        );
        if (!limit.ok) error = limit.unavailable ? c.failed : c.limited;
        else {
          result = await previewSharedRegistry(q, base);
          if (result.status !== "found")
            error = result.status === "invalid" ? c.invalid : c.missing;
        }
      } catch {
        error = c.failed;
      }
    }
  }
  const registry = result?.status === "found" ? result.registry : null;
  const occasion = registry ? occasionLabel(registry.type, locale) : c.other;
  const g = guestCopy(locale);
  return (
    <PageTransition>
      <div className={`${guest.page} ${guest.narrow}`}>
        <header className={guest.header}>
          <div>
            <h1 className={guest.title}>{c.title}</h1>
            <p className={guest.intro}>{c.intro}</p>
          </div>
        </header>
        {registry ? (
          <section className={styles.result} aria-labelledby="result-title">
            <p className={styles.resultKind}>{c.result}</p>
            <div className={styles.resultMain}>
              <span className={styles.resultIcon}>
                <ListChecks size={22} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <div>
                <h2 id="result-title">{registry.title}</h2>
                <p>
                  {[occasion, registry.eventDate ? formatEventDate(registry.eventDate, locale) : null, `${c.gifts}: ${registry.giftCount}`]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            </div>
            {!registry.giftCount && <p className={styles.resultNote}>{c.noGifts}</p>}
            <Link href={`/r/${registry.slug}`} className={styles.open} transitionTypes={["nav-forward"]}>
              {c.open}
            </Link>
          </section>
        ) : null}
        {error && (
          <p id="finder-error" role="alert" className={guest.error}>
            {error}
          </p>
        )}
        <ListFinder locale={locale} />
        <section id="scan" className={styles.scan} aria-label={g.findByLink}>
          <RegistryQrScanner baseUrl={base} />
        </section>
        <section className={styles.more} aria-labelledby="more-ways">
          <h2 id="more-ways">{g.otherWays}</h2>
          <ul className={rows.rows}>
            <li>
              <Link href="/registries" className={rows.row}>
                <span className={rows.thumb}>
                  <Search size={20} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className={rows.main}>
                  <strong>{workspaceCopy(locale).registrySearch}</strong>
                  <span className={rows.meta}>{c.privacy}</span>
                </span>
                <ChevronRight className={rows.chevron} size={18} aria-hidden="true" />
              </Link>
            </li>
            <li>
              <Link href="/create" className={rows.row}>
                <span className={rows.thumb}>
                  <Plus size={20} strokeWidth={2} aria-hidden="true" />
                </span>
                <span className={rows.main}>
                  <strong>{c.createLink}</strong>
                  <span className={rows.meta}>{c.create}</span>
                </span>
                <ChevronRight className={rows.chevron} size={18} aria-hidden="true" />
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </PageTransition>
  );
}
