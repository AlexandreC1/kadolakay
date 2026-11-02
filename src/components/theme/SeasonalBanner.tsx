import type { Season } from "@/lib/seasons";
import { foundationsCopy } from "@/lib/foundations-copy";
import { Link } from "@/i18n/navigation";
export function SeasonalBanner({
  season,
  locale,
  title,
  gifting,
  occasion,
}: {
  season: Season;
  locale: string;
  title?: string;
  gifting?: boolean;
  occasion?: string;
}) {
  if (season === "everyday" && !title) return null;
  const c = foundationsCopy(locale);
  const hasGifts =
    gifting ?? (season === "valentine" || season === "christmas");
  return (
    <aside
      className="seasonal-banner"
      data-season-banner={season}
      aria-label={c.season}
    >
      <div>
        <strong>
          {title || (season === "everyday" ? c.standard : c[season])}
        </strong>
        {!hasGifts && <span>{c.commemorate}</span>}
      </div>
      {hasGifts && (
        <Link
          href={`/discover?occasion=${occasion || (season === "christmas" ? "CHRISTMAS" : "VALENTINE")}`}
        >
          {c.seasonalGift}
        </Link>
      )}
    </aside>
  );
}
