import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
async function main() {
  const url = new URL(
    process.env.DATABASE_URL ?? "postgresql://invalid/invalid",
  );
  assert(
    ["127.0.0.1", "localhost"].includes(url.hostname) &&
      url.port === "55435" &&
      url.pathname === "/bayou_gifts_test",
    "Dedicated disposable gift test database required",
  );
  const { db } = await import("../src/lib/db");
  const { saveRegistrySelection } = await import(
    "../src/services/registry-selection"
  );
  const { GET } = await import("../src/app/api/gifts/route");
  const token = randomUUID();
  const ids: string[] = [];
  let businessId = "";
  try {
    const owner = await db.user.create({
      data: {
        name: "Fictional registry owner",
        email: `owner-${token}@example.invalid`,
      },
    });
    ids.push(owner.id);
    const merchant = await db.user.create({
      data: {
        name: "Fictional merchant",
        email: `merchant-${token}@example.invalid`,
        role: "BUSINESS_OWNER",
      },
    });
    ids.push(merchant.id);
    const registry = await db.registry.create({
      data: {
        userId: owner.id,
        slug: `test-${token}`,
        title: "Disposable gift test",
        type: "BABY_SHOWER",
        isPublic: false,
      },
    });
    const business = await db.business.create({
      data: {
        ownerId: merchant.id,
        name: "Fictional gift merchant",
        slug: `merchant-${token}`,
        category: "baby",
        status: "APPROVED",
      },
    });
    businessId = business.id;
    const products = await Promise.all(
      ["0.10", "20.00", "30.00"].map((priceUSD, i) =>
        db.product.create({
          data: {
            businessId: business.id,
            name: `Baby crib ${i}`,
            category: "baby",
            priceUSD,
          },
        }),
      ),
    );
    const unavailable = await db.product.create({
      data: {
        businessId: business.id,
        name: "Baby unavailable",
        priceUSD: "0.01",
        inStock: false,
      },
    });
    const result = await GET(
      new Request(
        "http://localhost/api/gifts?currency=USD&budget=0.10&occasion=BABY_SHOWER",
      ),
    );
    assert.equal(result.status, 200);
    const body = await result.json();
    assert.deepEqual(
      body.items.map((item: { id: string }) => item.id),
      [products[0].id],
    );
    assert.equal(body.items[0].price, "0.10");
    assert.equal(
      (await GET(new Request("http://localhost/api/gifts?budget=-1"))).status,
      400,
    );
    await assert.rejects(
      saveRegistrySelection(merchant.id, {
        registryId: registry.id,
        productIds: [products[0].id],
      }),
      /forbidden/,
    );
    await assert.rejects(
      saveRegistrySelection(owner.id, {
        registryId: registry.id,
        productIds: [products[0].id, unavailable.id],
      }),
      /unavailable/,
    );
    assert.equal(
      await db.registryItem.count({ where: { registryId: registry.id } }),
      0,
    );
    const overlapping = await Promise.all(
      [1, 2].map(() =>
        saveRegistrySelection(owner.id, {
          registryId: registry.id,
          productIds: products.map((product) => product.id),
        }),
      ),
    );
    assert.equal(
      overlapping.reduce((sum, item) => sum + item.added, 0),
      3,
    );
    assert.equal(
      await db.registryItem.count({ where: { registryId: registry.id } }),
      3,
    );
    assert.equal(
      (
        await saveRegistrySelection(owner.id, {
          registryId: registry.id,
          productIds: [products[0].id],
        })
      ).added,
      0,
    );
    await db.business.update({
      where: { id: business.id },
      data: { status: "SUSPENDED" },
    });
    const hidden = await (
      await GET(new Request("http://localhost/api/gifts?currency=USD"))
    ).json();
    assert.equal(hidden.items.length, 0);
    await assert.rejects(
      saveRegistrySelection(owner.id, {
        registryId: registry.id,
        productIds: [products[0].id],
      }),
      /unavailable/,
    );
    console.log(
      "Gift features PostgreSQL checks passed: exact budget, unavailable/suspended exclusion, invalid input, ownership, atomic failure, concurrent deduplication and retry safety.",
    );
  } finally {
    for (const id of ids)
      await db.registry.deleteMany({ where: { userId: id } });
    if (businessId) {
      await db.product.deleteMany({ where: { businessId } });
      await db.business.delete({ where: { id: businessId } });
    }
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
