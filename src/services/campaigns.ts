import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { parseEntityId } from "@/lib/validators/entity-id";
import {
  campaignSchema,
  haitiMidnight,
  inclusiveCampaignEnd,
  activeCampaign,
  campaignSeason,
} from "@/lib/campaign";
import { currentSeason } from "@/lib/seasons";
import { lockActor } from "./locked-actor";
import { auditOperation } from "./operation-audit";
const publicCampaignConfig = unstable_cache(
  async () => {
    const [settings, rows] = await Promise.all([
      db.siteSettings.findUnique({
        where: { id: "site" },
        select: { seasonalEnabled: true },
      }),
      db.seasonCampaign.findMany({
        where: { enabled: true, endsAt: { gt: new Date() } },
        select: {
          id: true,
          season: true,
          kind: true,
          occasion: true,
          titleEN: true,
          titleFR: true,
          titleHT: true,
          startsAt: true,
          endsAt: true,
          priority: true,
        },
        orderBy: [{ priority: "desc" }, { id: "asc" }],
        take: 100,
      }),
    ]);
    return {
      enabled: settings?.seasonalEnabled ?? true,
      rows: rows.map((r) => ({
        ...r,
        startsAt: r.startsAt.toISOString(),
        endsAt: r.endsAt.toISOString(),
      })),
    };
  },
  ["public-campaign-config-v1"],
  { revalidate: 60, tags: ["season-campaigns"] },
);
export async function seasonalPresentation(
  locale: string,
  preference: "auto" | "off",
  now = new Date(),
) {
  if (preference === "off")
    return { season: "everyday" as const, occasion: "ANY", gifting: false };
  try {
    const config = await publicCampaignConfig();
    if (!config.enabled)
      return { season: "everyday" as const, occasion: "ANY", gifting: false };
    const campaign = activeCampaign(
      config.rows.map((r) => ({
        ...r,
        startsAt: new Date(r.startsAt),
        endsAt: new Date(r.endsAt),
      })),
      now,
    );
    if (campaign)
      return {
        season: campaignSeason(campaign.season),
        occasion: campaign.occasion,
        gifting: campaign.kind === "GIFTING",
        title:
          locale === "ht"
            ? campaign.titleHT
            : locale === "fr"
              ? campaign.titleFR
              : campaign.titleEN,
      };
    const season = currentSeason(now);
    return {
      season,
      occasion:
        season === "christmas"
          ? "CHRISTMAS"
          : season === "valentine"
            ? "VALENTINE"
            : "ANY",
      gifting: season === "christmas" || season === "valentine",
    };
  } catch {
    return { season: "everyday" as const, occasion: "ANY", gifting: false };
  }
}
export async function saveCampaign(actorId: string, input: unknown) {
  actorId = parseEntityId(actorId);
  const data = campaignSchema.parse(input);
  if (data.id) parseEntityId(data.id);
  const { id, startDate, endDate, ...fields } = data;
  return db.$transaction(async (tx) => {
    await lockActor(tx, actorId, "admin:season");
    await tx.siteSettings.upsert({
      where: { id: "site" },
      create: { id: "site" },
      update: {},
    });
    await tx.$queryRaw`SELECT id FROM site_settings WHERE id='site' FOR UPDATE`;
    const prior = id
      ? await tx.seasonCampaign.findUnique({ where: { id } })
      : null;
    if (id && !prior) throw new Error("CAMPAIGN_UNAVAILABLE");
    if (
      fields.enabled &&
      !prior?.enabled &&
      (await tx.seasonCampaign.count({
        where: { enabled: true, endsAt: { gt: new Date() } },
      })) >= 100
    )
      throw new Error("CAMPAIGN_LIMIT");
    const payload = {
      ...fields,
      startsAt: haitiMidnight(startDate),
      endsAt: inclusiveCampaignEnd(endDate),
    };
    const row = prior
      ? await tx.seasonCampaign.update({
          where: { id: prior.id },
          data: payload,
        })
      : await tx.seasonCampaign.create({ data: payload });
    await auditOperation(
      tx,
      actorId,
      "CAMPAIGN_SAVED",
      "CAMPAIGN",
      row.id,
      prior?.enabled ? "ENABLED" : "DISABLED",
      row.enabled ? "ENABLED" : "DISABLED",
    );
    return row.id;
  });
}
export async function setSeasonalEnabled(actorId: string, enabled: boolean) {
  actorId = parseEntityId(actorId);
  if (typeof enabled !== "boolean") throw new Error("INVALID_PREFERENCE");
  await db.$transaction(async (tx) => {
    await lockActor(tx, actorId, "admin:season");
    await tx.siteSettings.upsert({
      where: { id: "site" },
      create: { id: "site" },
      update: {},
    });
    await tx.$queryRaw`SELECT id FROM site_settings WHERE id='site' FOR UPDATE`;
    const current = await tx.siteSettings.findUniqueOrThrow({
      where: { id: "site" },
    });
    if (current.seasonalEnabled === enabled) return;
    await tx.siteSettings.update({
      where: { id: "site" },
      data: { seasonalEnabled: enabled },
    });
    await auditOperation(
      tx,
      actorId,
      "SEASONS_TOGGLED",
      "SITE",
      "site",
      String(current.seasonalEnabled),
      String(enabled),
    );
  });
}
