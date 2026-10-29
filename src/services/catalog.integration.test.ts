import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { addCatalogGift, addCatalogGifts } from "./registry-catalog";
import { editOwnedProduct, registerOwnedBusiness } from "./business";
import { findPublicBusiness, findPublicProduct, listApprovedBusinesses } from "./catalog";
import { browseBusinessDirectory } from "./catalog-directory";

const run = process.env.RUN_DB_TESTS === "1";
const users: string[] = [];
afterAll(async () => {
  for (const id of users) await db.user.delete({ where: { id } });
  if (run) await db.$disconnect();
});
describe.skipIf(!run)("merchant catalog boundaries on PostgreSQL", () => {
  it("stores the patente privately without automatic approval or public DTO disclosure", async () => {
    const owner = await db.user.create({ data: { email: `${randomUUID()}@example.com` } }); users.push(owner.id);
    const id = await registerOwnedBusiness(owner.id, { name: "Patente privacy fixture", category: "home", patenteNumber: " 00123 / 2026-A " });
    const stored = await db.business.findUniqueOrThrow({ where: { id } });
    expect(stored.patenteNumber).toBe("00123 / 2026-A"); expect(stored.status).toBe("PENDING_REVIEW");
    expect(await findPublicBusiness(stored.slug)).toBeNull();
    await db.business.update({ where: { id }, data: { status: "APPROVED" } });
    expect(await findPublicBusiness(stored.slug)).not.toHaveProperty("patenteNumber");
    const listed = (await listApprovedBusinesses()).find(business => business.id === id);
    expect(listed).toBeDefined(); expect(listed).not.toHaveProperty("patenteNumber");
    const other = await db.user.create({ data: { email: `${randomUUID()}@example.com` } }); users.push(other.id);
    const blankId = await registerOwnedBusiness(other.id, { name: "Optional patente fixture", category: "home", patenteNumber: "" });
    expect((await db.business.findUniqueOrThrow({ where: { id: blankId } })).patenteNumber).toBeNull();
  });
  it("adds selections atomically, rejects a mixed unavailable batch, and preserves catalog currencies", async () => {
    const owner = await db.user.create({ data: { email: `${randomUUID()}@example.com` } }); users.push(owner.id);
    const merchant = await db.business.create({ data: { ownerId: owner.id, name: "Batch shop", slug: `batch-${randomUUID()}`, category: "Gifts", status: "APPROVED" } });
    const registry = await db.registry.create({ data: { userId: owner.id, slug: `batch-${randomUUID()}`, title: "Batch registry", type: "WEDDING" } });
    const first = await db.product.create({ data: { businessId: merchant.id, name: "First", priceUSD: "12.99", priceHTG: "1750.50" } });
    const second = await db.product.create({ data: { businessId: merchant.id, name: "Second", priceHTG: "2400.00", inStock: false } });
    const input = { registryId: registry.id, productIds: [first.id, second.id] };
    await expect(addCatalogGifts(owner.id, input)).rejects.toThrow("PRODUCT_UNAVAILABLE");
    expect(await db.registryItem.count({ where: { registryId: registry.id } })).toBe(0);
    await db.product.update({ where: { id: second.id }, data: { inStock: true } });
    expect(await addCatalogGifts(owner.id, input)).toEqual({ addedCount: 2 });
    const stored = await db.registryItem.findMany({ where: { registryId: registry.id }, orderBy: { title: "asc" } });
    expect(stored.map(item => [item.productId, item.priceUSD?.toString() ?? null, item.priceHTG?.toString()])).toEqual([[first.id, "12.99", "1750.5"], [second.id, null, "2400"]]);
    expect(stored.every(item => item.source === "LOCAL_BUSINESS" && item.businessId === merchant.id && item.quantity === 1)).toBe(true);
    const third = await db.product.create({ data: { businessId: merchant.id, name: "Third", priceUSD: "7.00" } });
    await expect(addCatalogGifts(owner.id, { registryId: registry.id, productIds: [first.id, third.id] })).rejects.toThrow("GIFT_ALREADY_ADDED");
    expect(await db.registryItem.count({ where: { registryId: registry.id, productId: third.id } })).toBe(0);
  });
  it("serializes overlapping selections so the losing batch adds none of its gifts", async () => {
    const owner = await db.user.create({ data: { email: `${randomUUID()}@example.com` } }); users.push(owner.id);
    const merchant = await db.business.create({ data: { ownerId: owner.id, name: "Concurrent shop", slug: `batch-${randomUUID()}`, category: "Gifts", status: "APPROVED" } });
    const registry = await db.registry.create({ data: { userId: owner.id, slug: `batch-${randomUUID()}`, title: "Concurrent registry", type: "BIRTHDAY" } });
    const products = await Promise.all(["Shared", "Left", "Right"].map(name => db.product.create({ data: { businessId: merchant.id, name, priceUSD: "5.00" } })));
    const results = await Promise.allSettled([
      addCatalogGifts(owner.id, { registryId: registry.id, productIds: [products[0].id, products[1].id] }),
      addCatalogGifts(owner.id, { registryId: registry.id, productIds: [products[0].id, products[2].id] }),
    ]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const stored = await db.registryItem.findMany({ where: { registryId: registry.id } });
    expect(stored).toHaveLength(2);
    expect(stored.filter(item => item.productId === products[0].id)).toHaveLength(1);
  }, 30000);
  it("rejects archived or foreign registries and suspended merchants without creating any selected gifts", async () => {
    const owner = await db.user.create({ data: { email: `${randomUUID()}@example.com` } }); users.push(owner.id);
    const other = await db.user.create({ data: { email: `${randomUUID()}@example.com` } }); users.push(other.id);
    const merchant = await db.business.create({ data: { ownerId: owner.id, name: "Suspended batch shop", slug: `batch-${randomUUID()}`, category: "Gifts", status: "SUSPENDED" } });
    const product = await db.product.create({ data: { businessId: merchant.id, name: "Unavailable", priceUSD: "9.00" } });
    const registry = await db.registry.create({ data: { userId: owner.id, slug: `batch-${randomUUID()}`, title: "Boundary registry", type: "WEDDING" } });
    const input = { registryId: registry.id, productIds: [product.id] };
    await expect(addCatalogGifts(other.id, input)).rejects.toThrow("REGISTRY_UNAVAILABLE");
    await expect(addCatalogGifts(owner.id, input)).rejects.toThrow("PRODUCT_UNAVAILABLE");
    await db.registry.update({ where: { id: registry.id }, data: { status: "ARCHIVED" } });
    await db.business.update({ where: { id: merchant.id }, data: { status: "APPROVED" } });
    await expect(addCatalogGifts(owner.id, input)).rejects.toThrow("REGISTRY_UNAVAILABLE");
    expect(await db.registryItem.count({ where: { registryId: registry.id } })).toBe(0);
  });
  it("paginates beyond one page, filters by category/city, and excludes unapproved merchants", async () => {
    const marker = `Directory-${randomUUID()}`;
    for (let i = 0; i < 16; i++) {
      const owner = await db.user.create({ data: { email: `${randomUUID()}@example.com` } }); users.push(owner.id);
      await db.business.create({ data: { ownerId: owner.id, name: `${marker} ${String(i).padStart(2,"0")}`, slug: `directory-${randomUUID()}`, category: i === 0 ? "baby" : "home", city: i === 0 ? "Cap-Haïtien" : "Jacmel", status: i === 14 ? "PENDING_REVIEW" : i === 15 ? "SUSPENDED" : "APPROVED" } });
    }
    const first = await browseBusinessDirectory({ q: marker, category: "" });
    expect(first.items).toHaveLength(12); expect(first.next).not.toBeNull();
    const second = await browseBusinessDirectory({ q: marker, category: "", after: first.next! });
    expect(second.items).toHaveLength(2); expect(second.next).toBeNull();
    expect(new Set([...first.items,...second.items].map(item => item.id)).size).toBe(14);
    const filtered = await browseBusinessDirectory({ q: "Cap-Haïtien", category: "baby" });
    expect(filtered.items.some(item => item.name.startsWith(marker))).toBe(true);
    expect((await browseBusinessDirectory({ q: "%", category: "" })).items).toHaveLength(0);
    expect(first.items[0]).not.toHaveProperty("ownerId");
  }, 30000);
  it("hides pending/suspended businesses and prevents cross-owner edits and duplicate gift races", async () => {
    const owner = await db.user.create({ data: { email: `${randomUUID()}@example.com`, role: "BUSINESS_OWNER" } }); users.push(owner.id);
    const other = await db.user.create({ data: { email: `${randomUUID()}@example.com`, role: "BUSINESS_OWNER" } }); users.push(other.id);
    const merchant = await db.business.create({ data: { ownerId: owner.id, name: "Catalog boundary test", slug: `catalog-${randomUUID()}`, category: "Gifts" } });
    const product = await db.product.create({ data: { businessId: merchant.id, name: "Gift", priceUSD: "15.00" } });
    const registry = await db.registry.create({ data: { userId: owner.id, slug: `registry-${randomUUID()}`, title: "Catalog test", type: "BIRTHDAY" } });
    expect(await findPublicBusiness(merchant.slug)).toBeNull();
    expect(await findPublicProduct(product.id)).toBeNull();
    await expect(addCatalogGift(owner.id, registry.id, product.id)).rejects.toThrow("PRODUCT_UNAVAILABLE");
    await db.business.update({ where: { id: merchant.id }, data: { status: "APPROVED" } });
    await expect(addCatalogGift(other.id, registry.id, product.id)).rejects.toThrow("REGISTRY_UNAVAILABLE");
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => addCatalogGift(owner.id, registry.id, product.id)));
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(await db.registryItem.count({ where: { registryId: registry.id, productId: product.id } })).toBe(1);
    await expect(editOwnedProduct(other.id, product.id, { name: "Tampered", priceUSD: 1, inStock: false })).rejects.toThrow();
    expect((await findPublicProduct(product.id))?.name).toBe("Gift");
    await editOwnedProduct(owner.id, product.id, { name: "Gift", priceUSD: 15, inStock: false });
    expect((await findPublicBusiness(merchant.slug))?.products).toHaveLength(0);
    await db.business.update({ where: { id: merchant.id }, data: { status: "SUSPENDED" } });
    expect(await findPublicProduct(product.id)).toBeNull();
    await expect(editOwnedProduct(owner.id, product.id, { name: "Gift", priceUSD: 15, inStock: true })).rejects.toThrow();
  }, 30000);
});
