import { describe, expect, it } from "vitest";
import { availableOf, findList, initialState, MAX_BATCH, nextListSlug, reducer, searchLists, type State } from "./store";

const host = () => reducer(initialState("fr"), { type: "signIn", as: "host" });
const merchant = () => reducer(initialState("fr"), { type: "signIn", as: "merchant" });
const run = (s: State, ...actions: Parameters<typeof reducer>[1][]) => actions.reduce(reducer, s);

describe("lists", () => {
  it("creates a draft owned by the signed-in person, with a unique link", () => {
    const s0 = host();
    const slug = nextListSlug(s0, "Fèt Ti Bebe Marie & Pierre");
    expect(slug).toBe("fet-ti-bebe-marie-pierre");
    const s1 = reducer(s0, { type: "createList", draft: { type: "BIRTHDAY", title: "  Fèt Ti Bebe Marie & Pierre ", visibility: "LINK" } });
    const list = findList(s1, slug)!;
    expect(list.status).toBe("DRAFT");
    expect(list.title).toBe("Fèt Ti Bebe Marie & Pierre");
    expect(list.ownerId).toBe("u-marie");
    expect(nextListSlug(s1, "Fèt Ti Bebe Marie & Pierre")).toBe("fet-ti-bebe-marie-pierre-2");
  });

  it("refuses to create a list when signed out or without a name", () => {
    const s = initialState();
    expect(reducer(s, { type: "createList", draft: { type: "OTHER", title: "X", visibility: "PUBLIC" } })).toBe(s);
    const h = host();
    expect(reducer(h, { type: "createList", draft: { type: "OTHER", title: "   ", visibility: "PUBLIC" } })).toBe(h);
  });

  it("only lets the owner change a list", () => {
    const s = merchant();
    const after = reducer(s, { type: "updateList", slug: "fet-ti-bebe-marie", patch: { title: "Hijacked" } });
    expect(findList(after, "fet-ti-bebe-marie")!.title).toBe("Fèt Ti Bebe Marie & Pierre");
  });

  it("adds catalog gifts all or nothing, at most 20, never twice", () => {
    const s = host();
    const ok = reducer(s, { type: "addProducts", slug: "50-an-tonton-joel", productIds: ["p-tab", "p-panye"] });
    expect(findList(ok, "50-an-tonton-joel")!.items).toHaveLength(4);
    // p-chez is already on the list, so the whole batch is refused.
    const dup = reducer(s, { type: "addProducts", slug: "50-an-tonton-joel", productIds: ["p-tab", "p-chez"] });
    expect(dup).toBe(s);
    // Out of stock refuses the batch too.
    expect(reducer(s, { type: "addProducts", slug: "50-an-tonton-joel", productIds: ["p-kanape"] })).toBe(s);
    expect(reducer(s, { type: "addProducts", slug: "50-an-tonton-joel", productIds: Array.from({ length: MAX_BATCH + 1 }, (_, i) => `p-${i}`) })).toBe(s);
  });

  it("keeps a gift someone already gave when the owner removes it", () => {
    const s = host();
    const after = run(s, { type: "removeGift", slug: "fet-ti-bebe-marie", giftId: "g-beso" }, { type: "removeGift", slug: "fet-ti-bebe-marie", giftId: "g-bibwon" });
    const ids = findList(after, "fet-ti-bebe-marie")!.items.map((g) => g.id);
    expect(ids).toContain("g-beso");
    expect(ids).not.toContain("g-bibwon");
  });
});

describe("giving", () => {
  const offer = { slug: "fet-ti-bebe-marie", giftId: "g-rad", quantity: 2, buyerName: "Fabiola", anonymous: false, currency: "HTG" as const, method: "MONCASH" as const };

  it("records the order and fills the gift, without going over what is needed", () => {
    const s = initialState();
    const after = reducer(s, { type: "offer", offer });
    const gift = findList(after, "fet-ti-bebe-marie")!.items.find((g) => g.id === "g-rad")!;
    expect(gift.fulfilledQty).toBe(3);
    expect(availableOf(gift).available).toBe(0);
    expect(after.orders[0]).toMatchObject({ registrySlug: "fet-ti-bebe-marie", businessSlug: "ti-bebe-boutik", status: "PAID", buyerName: "Fabiola" });
    expect(after.orders[0].orderNumber).toMatch(/^BY-[0-9A-Z]{5}$/);
    // Nothing left to give now.
    expect(reducer(after, { type: "offer", offer: { ...offer, quantity: 1 } })).toBe(after);
  });

  it("refuses custom gifts, held units, drafts and missing names", () => {
    const s = initialState();
    expect(reducer(s, { type: "offer", offer: { ...offer, giftId: "g-kouch", quantity: 1 } })).toBe(s);
    // g-asyet has its only unit held by another payment.
    expect(reducer(s, { type: "offer", offer: { ...offer, slug: "maryaj-jean-rose", giftId: "g-asyet", quantity: 1 } })).toBe(s);
    expect(reducer(s, { type: "offer", offer: { ...offer, slug: "50-an-tonton-joel", giftId: "g-chez", quantity: 1 } })).toBe(s);
    expect(reducer(s, { type: "offer", offer: { ...offer, buyerName: "  " } })).toBe(s);
  });
});

describe("shops", () => {
  it("moves an order one step at a time, only for its own shop", () => {
    const s = merchant();
    const skip = reducer(s, { type: "orderStatus", orderId: "o-2", status: "SHIPPED" });
    expect(skip.orders.find((o) => o.id === "o-2")!.status).toBe("PAID");
    const step = reducer(s, { type: "orderStatus", orderId: "o-2", status: "CONFIRMED" });
    expect(step.orders.find((o) => o.id === "o-2")!.status).toBe("CONFIRMED");
    const other = reducer(s, { type: "orderStatus", orderId: "o-1", status: "DELIVERED" });
    expect(other.orders.find((o) => o.id === "o-1")!.status).toBe("SHIPPED");
  });

  it("edits stock only for its own products", () => {
    const s = merchant();
    expect(reducer(s, { type: "setStock", productId: "p-tab", stockQuantity: 7.9 }).products.find((p) => p.id === "p-tab")!.stockQuantity).toBe(7);
    expect(reducer(s, { type: "setStock", productId: "p-beso", stockQuantity: 0 }).products.find((p) => p.id === "p-beso")!.stockQuantity).toBe(4);
  });
});

describe("finding lists", () => {
  it("matches public names without accents, and shared links even when not searchable", () => {
    const s = initialState();
    expect(searchLists(s, "fet ti bebe").map((l) => l.slug)).toEqual(["fet-ti-bebe-marie"]);
    expect(searchLists(s, "https://bayou.example/ht/r/maryaj-jean-rose").map((l) => l.slug)).toEqual(["maryaj-jean-rose"]);
    // Drafts never show up.
    expect(searchLists(s, "Tonton")).toEqual([]);
  });
});
