import type { Season } from "@/lib/seasons";
import { foundationsCopy } from "@/lib/foundations-copy";
import { Link } from "@/i18n/navigation";
export function SeasonalBanner({
  season,
  locale,
}: {
  season: Season;
  locale: string;
}) {
  if (season === "everyday") return null;
  const c = foundationsCopy(locale);
  const gifting = season === "valentine" || season === "christmas";
  return (
    <aside
      className="seasonal-banner"
      data-season-banner={season}
      aria-label={c.season}
    >
      <div>
        <strong>{c[season]}</strong>
        {!gifting && <span>{c.commemorate}</span>}
      </div>
      {gifting && (
        <Link
          href={`/discover?occasion=${season === "christmas" ? "CHRISTMAS" : "VALENTINE"}`}
        >
          {c.seasonalGift}
        </Link>
      )}
    </aside>
  );
}
