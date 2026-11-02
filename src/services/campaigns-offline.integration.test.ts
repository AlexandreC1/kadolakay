import { afterAll, beforeAll, describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { saveCampaign, setSeasonalEnabled } from "./campaigns";
vi.mock("next/cache", () => ({ unstable_cache: (f: unknown) => f }));
const run = process.env.RUN_DB_TESTS === "1",
  users: string[] = [],
  campaigns: string[] = [];
let previous: boolean | undefined;
beforeAll(async () => {
  if (run) {
    if (!new URL(process.env.DATABASE_URL!).pathname.endsWith("_test"))
      throw new Error("Test DB required");
    previous = (await db.siteSettings.findUnique({ where: { id: "site" } }))
      ?.seasonalEnabled;
  }
});
afterAll(async () => {
  if (!run) return;
  await db.seasonCampaign.deleteMany({ where: { id: { in: campaigns } } });
  if (previous === undefined)
    await db.siteSettings.deleteMany({ where: { id: "site" } });
  else
    await db.siteSettings.update({
      where: { id: "site" },
      data: { seasonalEnabled: previous },
    });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
});
describe.skipIf(!run)("campaign governance", () => {
  it("requires the owner, preserves literal translations and audits the disable switch", async () => {
    const owner = await db.user.create({
        data: { email: randomUUID() + "@example.invalid", role: "SUPERADMIN" },
      }),
      member = await db.user.create({
        data: { email: randomUUID() + "@example.invalid", role: "ADMIN" },
      });
    users.push(owner.id, member.id);
    const input = {
      titleEN: "<script>literal title</script>",
      titleFR: "Titre test",
      titleHT: "Tit tès",
      season: "christmas",
      kind: "GIFTING",
      occasion: "CHRISTMAS",
      startDate: "2026-12-01",
      endDate: "2026-12-25",
      priority: 10,
      enabled: false,
    };
    await expect(saveCampaign(member.id, input)).rejects.toThrow("Forbidden");
    const id = await saveCampaign(owner.id, input);
    campaigns.push(id);
    expect(
      (await db.seasonCampaign.findUniqueOrThrow({ where: { id } })).titleEN,
    ).toBe(input.titleEN);
    await setSeasonalEnabled(owner.id, false);
    expect(
      (await db.siteSettings.findUniqueOrThrow({ where: { id: "site" } }))
        .seasonalEnabled,
    ).toBe(false);
    expect(
      await db.operationAuditEvent.count({
        where: { actorId: owner.id, action: "CAMPAIGN_SAVED" },
      }),
    ).toBe(1);
  });
});
