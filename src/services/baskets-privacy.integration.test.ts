import { updateOwnedRegistry } from "./registry";
import { updateRegistrySchema } from "@/lib/validators/registry";
import {
  addManualGift,
  updateOwnedGift,
  removeOwnedGift,
} from "./registry-items";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  createBasket,
  updateBasket,
  saveRegistryPrivacy,
  unlockRegistry,
  searchPublicRegistries,
} from "./baskets-privacy";
import { findPublicRegistry, publishOwnedRegistry } from "./registry";
const run = process.env.RUN_DB_TESTS === "1",
  users: string[] = [];
beforeAll(() => {
  if (run) {
    if (!new URL(process.env.DATABASE_URL!).pathname.endsWith("_test"))
      throw new Error("Disposable test DB required");
    vi.stubEnv(
      "AUTH_SECRET",
      "test-fixture-secret-with-more-than-32-characters",
    );
  }
});
afterAll(async () => {
  if (!run) return;
  for (const id of users) await db.user.delete({ where: { id } });
  await db.$disconnect();
  vi.unstubAllEnvs();
});
async function user() {
  const u = await db.user.create({
    data: {
      email: `${randomUUID()}@example.invalid`,
      name: `Public search ${randomUUID()}`,
    },
  });
  users.push(u.id);
  return u;
}
const details = {
  title: "For a loved one",
  recipientName: "Recipient <script>literal</script>",
  recipientMessage: "Keep as literal text",
  kind: "BASKET_SHARED",
  type: "BIRTHDAY",
  locale: "en",
};
describe.skipIf(!run)("baskets and deliberate registry privacy", () => {
  it("edits manual quantities without changing catalog facts and rejects archive/foreign mutations", async () => {
    const owner = await user(),
      other = await user(),
      b = await createBasket(owner.id, details);
    const item = await addManualGift(owner.id, b.id, {
      title: "A gift",
      source: "CUSTOM",
      quantity: 2,
    });
    await updateOwnedGift(owner.id, item.id, { quantity: 5 });
    await expect(removeOwnedGift(other.id, item.id)).rejects.toThrow(
      "Registry not found",
    );
    expect(
      (await db.registryItem.findUniqueOrThrow({ where: { id: item.id } }))
        .quantity,
    ).toBe(5);
    await db.registry.update({
      where: { id: b.id },
      data: { status: "ARCHIVED" },
    });
    await expect(
      addManualGift(owner.id, b.id, { title: "Late gift", source: "CUSTOM" }),
    ).rejects.toThrow("Registry not found");
    await expect(removeOwnedGift(owner.id, item.id)).rejects.toThrow(
      "Registry not found",
    );
  });
  it("creates reloadable private drafts in either mode without a recipient account", async () => {
    const owner = await user(),
      other = await user();
    const count = await db.user.count();
    for (const kind of ["BASKET_PERSONAL", "BASKET_SHARED"]) {
      const b = await createBasket(owner.id, { ...details, kind });
      const stored = await db.registry.findUniqueOrThrow({
        where: { id: b.id },
      });
      expect(stored).toMatchObject({
        visibility: "PRIVATE",
        searchable: false,
        isPublic: false,
        recipientName: details.recipientName,
        status: "DRAFT",
      });
      expect(await findPublicRegistry(b.slug)).toBeNull();
      await expect(
        updateBasket(other.id, b.id, { ...details, locale: undefined }),
      ).rejects.toThrow();
    }
    expect(await db.user.count()).toBe(count);
  });
  it("only discovers explicitly searchable public lists and keeps password grants scoped", async () => {
    const owner = await user(),
      other = await user();
    const b = await createBasket(owner.id, details);
    await db.registryItem.create({
      data: { registryId: b.id, title: "A gift" },
    });
    await publishOwnedRegistry(owner.id, b.id);
    expect(await findPublicRegistry(b.slug)).toBeNull();
    await expect(
      saveRegistryPrivacy(other.id, {
        registryId: b.id,
        visibility: "PUBLIC",
        searchable: true,
      }),
    ).rejects.toThrow("REGISTRY_UNAVAILABLE");
    await saveRegistryPrivacy(owner.id, {
      registryId: b.id,
      visibility: "UNLISTED",
      searchable: false,
    });
    expect(await findPublicRegistry(b.slug)).not.toBeNull();
    expect(
      (await searchPublicRegistries({ q: owner.name! })).items,
    ).toHaveLength(0);
    await saveRegistryPrivacy(owner.id, {
      registryId: b.id,
      visibility: "PUBLIC",
      searchable: true,
    });
    expect(
      (await searchPublicRegistries({ q: owner.name! })).items.map((r) => r.id),
    ).toContain(b.id);
    await saveRegistryPrivacy(owner.id, {
      registryId: b.id,
      visibility: "PROTECTED",
      searchable: false,
      password: "private-list-password",
    });
    expect(await findPublicRegistry(b.slug)).toBeNull();
    await expect(unlockRegistry(b.slug, "wrong-password")).rejects.toThrow(
      "REGISTRY_ACCESS_INVALID",
    );
    const grant = await unlockRegistry(b.slug, "private-list-password");
    expect((await findPublicRegistry(b.slug, grant))?.recipientName).toBe(
      details.recipientName,
    );
    await saveRegistryPrivacy(owner.id, {
      registryId: b.id,
      visibility: "PROTECTED",
      searchable: false,
      password: "new-private-password",
    });
    expect(await findPublicRegistry(b.slug, grant)).toBeNull();
    await updateOwnedRegistry(
      owner.id,
      b.id,
      updateRegistrySchema.parse({ title: "Renamed private basket" }),
    );
    expect(
      (await db.registry.findUniqueOrThrow({ where: { id: b.id } })).visibility,
    ).toBe("PROTECTED");
    expect(await findPublicRegistry(b.slug)).toBeNull();
    expect(
      (await searchPublicRegistries({ q: owner.name! })).items,
    ).toHaveLength(0);
  });
  it("rejects identity/role/style injection, invalid visibility and personal-basket search", async () => {
    const owner = await user();
    await expect(
      createBasket(owner.id, { ...details, userId: "other" }),
    ).rejects.toThrow();
    const b = await createBasket(owner.id, {
      ...details,
      kind: "BASKET_PERSONAL",
    });
    await expect(
      saveRegistryPrivacy(owner.id, {
        registryId: b.id,
        visibility: "PUBLIC",
        searchable: true,
      }),
    ).rejects.toThrow("PERSONAL_BASKET_NOT_SEARCHABLE");
    await expect(
      saveRegistryPrivacy(owner.id, {
        registryId: b.id,
        visibility: "PRIVATE",
        searchable: true,
      }),
    ).rejects.toThrow();
    await expect(
      saveRegistryPrivacy(owner.id, {
        registryId: b.id,
        visibility: "PROTECTED",
        searchable: false,
      }),
    ).rejects.toThrow("PASSWORD_REQUIRED");
    await db.user.update({
      where: { id: owner.id },
      data: { suspendedAt: new Date() },
    });
    await expect(createBasket(owner.id, details)).rejects.toThrow("Forbidden");
  });
});
