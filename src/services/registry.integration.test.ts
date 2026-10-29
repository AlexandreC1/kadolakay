import { describe, expect, it, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { findPublicRegistry, updateOwnedRegistry, listOwnedRegistries, createRegistryForUser } from "./registry";
import { createRegistrySchema } from "@/lib/validators/registry";
import { previewSharedRegistry } from "./registry-finder";
import { createPublicRegistryQr } from "./registry-qr";
const run = process.env.RUN_DB_TESTS === "1";
const users: string[] = [];
afterAll(async () => { for (const id of users) await db.user.delete({ where: { id } }); if (run) await db.$disconnect(); });
describe.skipIf(!run)("Registry privacy against PostgreSQL", () => {
  it("persists a draft with optional links and dates left empty or supplied", async () => {
    const owner = await db.user.create({ data: { email: `${randomUUID()}@example.com` } }); users.push(owner.id);
    for (const eventDate of ["2027-06-28", ""]) {
      const input = createRegistrySchema.parse({ title: "New baby list", description: "Welcome to the family.", type: "BABY_SHOWER", locale: "en", eventDate, amazonWishlistUrl: "" });
      const draft = await createRegistryForUser(owner.id, input);
      expect(draft.status).toBe("DRAFT"); expect(draft.userId).toBe(owner.id);
      expect(draft.eventDate?.toISOString().slice(0, 10) || "").toBe(eventDate);
      expect(await findPublicRegistry(draft.slug)).toBeNull();
    }
  });
  it("hides private, draft, password-protected and archived data, and denies another owner's update", async () => {
    const owner = await db.user.create({ data: { email: `${randomUUID()}@example.com` } }); users.push(owner.id);
    const slug = `privacy-${randomUUID()}`;
    const registry = await db.registry.create({ data: { userId: owner.id, slug, type: "WEDDING", title: "Private gift list", status: "DRAFT" } });
    expect(await findPublicRegistry(slug)).toBeNull();
    expect(await previewSharedRegistry(slug, "https://kadolakay.example")).toEqual({ status: "missing" });
    expect(await createPublicRegistryQr(slug, "en", "https://kadolakay.example")).toBeNull();
    await db.registry.update({ where: { id: registry.id }, data: { status: "PUBLISHED", isPublic: false } });
    expect(await findPublicRegistry(slug)).toBeNull();
    expect(await createPublicRegistryQr(slug, "en", "https://kadolakay.example")).toBeNull();
    expect(await previewSharedRegistry(slug, "https://kadolakay.example")).toEqual({ status: "missing" });
    await db.registry.update({ where: { id: registry.id }, data: { isPublic: true, password: "legacy-protection" } });
    const protectedOverview = await listOwnedRegistries(owner.id);
    expect(protectedOverview[0].canView).toBe(false);
    expect(protectedOverview[0]).not.toHaveProperty("password");
    expect(await listOwnedRegistries("different-owner")).toEqual([]);
    expect(await findPublicRegistry(slug)).toBeNull();
    expect(await createPublicRegistryQr(slug, "en", "https://kadolakay.example")).toBeNull();
    expect(await previewSharedRegistry(slug, "https://kadolakay.example")).toEqual({ status: "missing" });
    await db.registry.update({ where: { id: registry.id }, data: { password: null } });
    const publicData = await findPublicRegistry(slug);
    expect(publicData?.title).toBe("Private gift list");
    await db.registryItem.create({ data: { registryId: registry.id, title: "Example gift", source: "CUSTOM" } });
    const ownerOverview = await listOwnedRegistries(owner.id);
    expect(ownerOverview[0].canView).toBe(true);
    expect(ownerOverview[0].items[0]).toEqual({ quantity: 1, fulfilledQty: 0, availableQty: 1 });
    const preview = await previewSharedRegistry(`/en/r/${slug}`, "https://kadolakay.example");
    expect(preview.status).toBe("found");
    if (preview.status === "found") {
      expect(preview.registry.giftCount).toBe(1);
      expect(Object.keys(preview.registry).sort()).toEqual(["eventDate", "giftCount", "slug", "title", "type"]);
    }
    expect(publicData).not.toHaveProperty("password"); expect(publicData).not.toHaveProperty("userId"); expect(publicData?.user).not.toHaveProperty("email");
    await expect(updateOwnedRegistry("different-owner", registry.id, { title: "Hijacked" })).rejects.toThrow();
    expect((await db.registry.findUniqueOrThrow({ where: { id: registry.id } })).title).toBe("Private gift list");
    await db.registry.update({ where: { id: registry.id }, data: { status: "ARCHIVED" } });
    expect(await listOwnedRegistries(owner.id)).toEqual([]);
    expect(await findPublicRegistry(slug)).toBeNull();
    expect(await createPublicRegistryQr(slug, "en", "https://kadolakay.example")).toBeNull();
    expect(await previewSharedRegistry(slug, "https://kadolakay.example")).toEqual({ status: "missing" });
  });
});
