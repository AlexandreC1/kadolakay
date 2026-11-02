import { requireBackoffice } from "@/services/backoffice-auth";
import { db } from "@/lib/db";
import { getLocale } from "next-intl/server";
import { workspaceCopy } from "@/lib/workspace-copy";
import { CampaignForm } from "@/components/theme/CampaignForm";
import { FoundationForm } from "@/components/shared/FoundationForm";
import { saveSeasonSwitch } from "@/actions/workspaces";
import { campaignSeason, haitiDate } from "@/lib/campaign";
export default async function SeasonsPage() {
  const actor = await requireBackoffice(),
    locale = await getLocale(),
    c = workspaceCopy(locale);
  const [rows, settings] = await Promise.all([
    db.seasonCampaign.findMany({
      orderBy: [{ startsAt: "desc" }, { id: "asc" }],
      take: 100,
    }),
    db.siteSettings.findUnique({
      where: { id: "site" },
      select: { seasonalEnabled: true },
    }),
  ]);
  return (
    <div className="foundation-page">
      <header className="foundation-intro">
        <h1>{c.seasons}</h1>
        <p>{c.campaignIntro}</p>
      </header>
      {actor.role === "SUPERADMIN" && (
        <>
          <FoundationForm
            action={saveSeasonSwitch}
            locale={locale}
            label={c.save}
          >
            <label htmlFor="season-enabled">{c.disableAll}</label>
            <select
              id="season-enabled"
              name="enabled"
              defaultValue={String(settings?.seasonalEnabled ?? true)}
            >
              <option value="true">{c.active}</option>
              <option value="false">{c.suspended}</option>
            </select>
          </FoundationForm>
          <details className="foundation-panel workspace-section">
            <summary>
              {c.seasons}: {c.save}
            </summary>
            <CampaignForm locale={locale} />
          </details>
        </>
      )}
      <div className="workspace-list">
        {rows.map((row) => (
          <article className="foundation-panel" key={row.id}>
            <aside
              className="seasonal-banner"
              data-season-banner={campaignSeason(row.season)}
            >
              <strong>
                {locale === "ht"
                  ? row.titleHT
                  : locale === "fr"
                    ? row.titleFR
                    : row.titleEN}
              </strong>
            </aside>
            <p>
              {haitiDate(row.startsAt)} /{" "}
              {haitiDate(new Date(row.endsAt.getTime() - 1))}
            </p>
            <p>
              {row.enabled ? c.active : c.suspended} ·{" "}
              {c[row.kind as "GIFTING"]}
            </p>
            {actor.role === "SUPERADMIN" && (
              <details>
                <summary>{c.manage}</summary>
                <CampaignForm locale={locale} campaign={row} />
              </details>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
