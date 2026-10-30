import { afterAll, beforeAll, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  grantPremium,
  revokePremium,
  getPremiumAccess,
  personalizeRegistry,
  registryInsights,
  requestMerchantPaymentSetup,
} from "./product-foundations";
import { discoverGifts } from "./discovery";
import { findPublicRegistry } from "./registry";
const run = process.env.RUN_DB_TESTS === "1";
const users: string[] = [];
beforeAll(()=>{if(run&&!new URL(process.env.DATABASE_URL!).pathname.endsWith("_test"))throw new Error("Disposable _test database required");});
async function user(
  role: "USER" | "SUPERADMIN" | "ADMIN" | "BUSINESS_OWNER" = "USER",
) {
  const u = await db.user.create({
    data: { email: `${randomUUID()}@example.invalid`, role },
  });
  users.push(u.id);
  return u;
}
afterAll(async () => {
  if (!run) return;
  for (const id of users) await db.user.delete({ where: { id } });
  await db.$disconnect();
});
describe.skipIf(!run)("product foundation database rules", () => {
  it("rolls back a Premium grant when its audit insert fails",async()=>{
    const owner=await user(),admin=await user("SUPERADMIN");
    await db.$executeRawUnsafe("CREATE FUNCTION reject_premium_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected audit failure'; END $$");
    await db.$executeRawUnsafe("CREATE TRIGGER reject_premium_fixture BEFORE INSERT ON premium_audit_events FOR EACH ROW EXECUTE FUNCTION reject_premium_fixture()");
    try {
      await expect(grantPremium(admin.id,owner.id,new Date(Date.now()+86400000))).rejects.toThrow("injected audit failure");
      expect(await db.premiumGrant.findUnique({where:{userId:owner.id}})).toBeNull();
    }finally{
      await db.$executeRawUnsafe("DROP TRIGGER reject_premium_fixture ON premium_audit_events");
      await db.$executeRawUnsafe("DROP FUNCTION reject_premium_fixture()");
    }
  });
  it("allows audited expiring grants only from fresh SUPERADMIN roles", async () => {
    const admin = await user("SUPERADMIN"),
      target = await user();
    const expiresAt = new Date(Date.now() + 86400000);
    await grantPremium(admin.id, target.id, expiresAt);
    expect((await getPremiumAccess(target.id)).active).toBe(true);
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: target.id } })).role,
    ).toBe("USER");
    expect(
      await db.premiumAuditEvent.count({
        where: { actorId: admin.id, targetId: target.id },
      }),
    ).toBe(1);
    await db.user.update({ where: { id: admin.id }, data: { role: "ADMIN" } });
    await expect(grantPremium(admin.id, target.id, expiresAt)).rejects.toThrow(
      "Forbidden",
    );
    expect(
      await db.premiumAuditEvent.count({ where: { targetId: target.id } }),
    ).toBe(1);
  });
  it("protects ownership, resets on expiry and keeps grant data out of public DTOs", async () => {
    const owner = await user(),
      other = await user(),
      admin = await user("SUPERADMIN");
    const registry = await db.registry.create({
      data: {
        userId: owner.id,
        title: "Palette fixture",
        slug: `palette-${randomUUID()}`,
        type: "BIRTHDAY",
        status: "PUBLISHED",
      },
    });
    await expect(
      personalizeRegistry(owner.id, registry.id, "rose"),
    ).rejects.toThrow("PREMIUM_REQUIRED");
    await grantPremium(admin.id, owner.id, new Date(Date.now() + 86400000));
    await grantPremium(admin.id, other.id, new Date(Date.now() + 86400000));
    await expect(
      personalizeRegistry(other.id, registry.id, "rose"),
    ).rejects.toThrow("REGISTRY_UNAVAILABLE");
    await personalizeRegistry(owner.id, registry.id, "rose");
    const published = await findPublicRegistry(registry.slug);
    expect(published?.palette).toBe("rose");
    expect(published?.user).not.toHaveProperty("premiumGrant");
    await db.premiumGrant.update({
      where: { userId: owner.id },
      data: { expiresAt: new Date(Date.now() - 1) },
    });
    expect((await findPublicRegistry(registry.slug))?.palette).toBe("mint");
    expect(
      (await db.registry.findUniqueOrThrow({ where: { id: registry.id } }))
        .palette,
    ).toBe("rose");
    await expect(
      personalizeRegistry(owner.id, registry.id, "gold"),
    ).rejects.toThrow("PREMIUM_REQUIRED");
    await personalizeRegistry(owner.id, registry.id, "mint");
    expect(
      (await db.registry.findUniqueOrThrow({ where: { id: registry.id } }))
        .palette,
    ).toBe("mint");
  });
  it("aggregates only owned registry quantities and denies expired insights", async () => {
    const owner = await user(),
      other = await user(),
      admin = await user("SUPERADMIN");
    await grantPremium(admin.id, owner.id, new Date(Date.now() + 86400000));
    const registry = await db.registry.create({
      data: {
        userId: owner.id,
        title: "Insight fixture",
        slug: `insight-${randomUUID()}`,
        type: "WEDDING",
        items: {
          create: {
            title: "One gift",
            quantity: 4,
            fulfilledQty: 1,
            reservedQty: 2,
          },
        },
      },
    });
    await db.registry.create({
      data: {
        userId: other.id,
        title: "Private other",
        slug: `insight-${randomUUID()}`,
        type: "BIRTHDAY",
      },
    });
    const rows = await registryInsights(owner.id);
    expect(rows.map((r) => r.id)).toEqual([registry.id]);
    expect(rows[0]).toMatchObject({
      requested: BigInt(4),
      fulfilled: BigInt(1),
      held: BigInt(2),
    });
    expect(rows[0]).not.toHaveProperty("buyerEmail");
    await db.premiumGrant.update({
      where: { userId: owner.id },
      data: { expiresAt: new Date(0) },
    });
    await expect(registryInsights(owner.id)).rejects.toThrow(
      "PREMIUM_REQUIRED",
    );
  });
  it("keeps payment preference private and never activates collection", async () => {
    const owner = await user("BUSINESS_OWNER"),
      other = await user("BUSINESS_OWNER");
    const business = await db.business.create({
      data: {
        ownerId: owner.id,
        name: "Preference fixture",
        slug: `pay-${randomUUID()}`,
        category: "home",
      },
    });
    await expect(
      requestMerchantPaymentSetup(other.id, "moncash"),
    ).rejects.toThrow("MERCHANT_UNAVAILABLE");
    await requestMerchantPaymentSetup(owner.id, "moncash");
    await requestMerchantPaymentSetup(owner.id, "card");
    expect(
      await db.merchantPaymentProfile.count({
        where: { businessId: business.id },
      }),
    ).toBe(1);
    expect(
      (
        await db.merchantPaymentProfile.findUniqueOrThrow({
          where: { businessId: business.id },
        })
      ).provider,
    ).toBe("card");
    expect(
      (await db.business.findUniqueOrThrow({ where: { id: business.id } }))
        .stripeAccountId,
    ).toBeNull();
    await db.business.update({
      where: { id: business.id },
      data: { status: "SUSPENDED" },
    });
    await expect(
      requestMerchantPaymentSetup(owner.id, "natcash"),
    ).rejects.toThrow("MERCHANT_UNAVAILABLE");
    await db.business.update({
      where: { id: business.id },
      data: { status: "APPROVED" },
    });
    await db.user.update({ where: { id: owner.id }, data: { role: "USER" } });
    await expect(
      requestMerchantPaymentSetup(owner.id, "moncash"),
    ).rejects.toThrow("Forbidden");
  });
  it("filters currency, approval and physical stock with real SQL and exact boundary prices", async () => {
    const owner = await user("BUSINESS_OWNER");
    const business = await db.business.create({
      data: {
        ownerId: owner.id,
        name: "Discovery fixture",
        slug: `discover-${randomUUID()}`,
        category: "home",
        status: "APPROVED",
      },
    });
    const names = [
      "Exact",
      "Over",
      "Unknown",
      "Held",
      "HTG only",
      "Unavailable",
    ];
    const products = [];
    for (const name of names)
      products.push(
        await db.product.create({
          data: {
            businessId: business.id,
            name,
            category: "home",
            priceUSD:
              name === "HTG only" ? null : name === "Over" ? "50.01" : "50.00",
            priceHTG: "100.00",
            inStock: name !== "Unavailable",
            stockQuantity: name === "Unknown" ? null : 2,
            reservedStock: name === "Held" ? 2 : 0,
          },
        }),
      );
    const usd = await discoverGifts({
      budget: "50.00",
      currency: "USD",
      occasion: "WEDDING",
    });
    expect(
      usd.filter((p) => p.businessId === business.id).map((p) => p.name),
    ).toEqual(["Exact"]);
    const htg = await discoverGifts({
      budget: "100.00",
      currency: "HTG",
      occasion: "ANY",
    });
    expect(
      htg
        .filter((p) => p.businessId === business.id)
        .map((p) => p.name)
        .sort(),
    ).toEqual(["Exact", "HTG only", "Over"]);
    expect(htg.every((p) => !Object.hasOwn(p, "patenteNumber"))).toBe(true);
    await db.business.update({
      where: { id: business.id },
      data: { status: "SUSPENDED" },
    });
    expect(
      (
        await discoverGifts({ budget: "100", currency: "HTG", occasion: "ANY" })
      ).some((p) => p.businessId === business.id),
    ).toBe(false);
  });
  it("protects Premium audit immutability and database palette/provider constraints", async () => {
    const owner = await user(),
      admin = await user("SUPERADMIN");
    await grantPremium(admin.id, owner.id, new Date(Date.now() + 86400000));
    const event = await db.premiumAuditEvent.findFirstOrThrow({
      where: { targetId: owner.id },
    });
    await expect(
      db.premiumAuditEvent.delete({ where: { id: event.id } }),
    ).rejects.toThrow();
    await expect(
      db.premiumAuditEvent.update({
        where: { id: event.id },
        data: { actorId: owner.id },
      }),
    ).rejects.toThrow();
    await expect(
      db.registry.create({
        data: {
          userId: owner.id,
          title: "Invalid palette",
          slug: `invalid-${randomUUID()}`,
          type: "OTHER",
          palette: "url(javascript:alert(1))",
        },
      }),
    ).rejects.toThrow();
  });
  it("revokes access immediately with an audited, replay-safe owner operation", async () => {
    const owner = await user(),
      admin = await user("SUPERADMIN");
    await grantPremium(admin.id, owner.id, new Date(Date.now() + 86400000));
    await expect(revokePremium(owner.id, owner.id)).rejects.toThrow(
      "Forbidden",
    );
    await revokePremium(admin.id, owner.id);
    await revokePremium(admin.id, owner.id);
    expect((await getPremiumAccess(owner.id)).active).toBe(false);
    expect(
      await db.premiumAuditEvent.count({ where: { targetId: owner.id } }),
    ).toBe(2);
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: owner.id } })).role,
    ).toBe("USER");
  });
});
