import { afterAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";

const sent: { to: string; code: string }[] = [];
vi.mock("@/lib/mobile-email", () => ({
  codeMailer: () => "resend",
  sendSignInCode: async (to: string, code: string) => { sent.push({ to, code }); return true; },
}));

const {
  createMobileSession, resolveMobileSession, revokeMobileSession, startEmailSignIn, verifyEmailSignIn, signInWithGoogle, requireMobileActor,
} = await import("./mobile-auth");
const { pledgeGift, cancelPledge, listOwnPledges } = await import("./pledges");
const { addGifts, createList, listMine, publishList, removeGift, searchLists, setStock, updateList, viewList, catalog } = await import("./mobile-api");

const run = process.env.RUN_DB_TESTS === "1", users: string[] = [];
async function user(name = "Guest") {
  const u = await db.user.create({ data: { email: `${randomUUID()}@example.com`, name } });
  users.push(u.id);
  return u;
}
afterAll(async () => {
  for (const id of users) await db.user.delete({ where: { id } }).catch(() => {});
  await db.emailSignInCode.deleteMany({ where: { email: { endsWith: "@mobile.example.com" } } });
  if (run) await db.$disconnect();
});

async function publishedList(ownerId: string, quantity = 3, visibility: "PUBLIC" | "LINK" | "PRIVATE" = "PUBLIC") {
  const { slug } = await createList(ownerId, { type: "WEDDING", title: `Maryaj ${randomUUID().slice(0, 8)}`, visibility, place: "Jacmel", locale: "ht" });
  await addGifts(ownerId, slug, { custom: { title: "Dra kabann", priceHTG: 8750, quantity } });
  await publishList(ownerId, slug);
  const list = (await viewList(slug, ownerId))!;
  return { slug, giftId: list.items[0].id };
}

describe.skipIf(!run)("mobile sign-in on PostgreSQL", () => {
  it("creates an account from a correct code, and retires a code after five wrong tries", async () => {
    const email = `${randomUUID()}@mobile.example.com`;
    await startEmailSignIn(email.toUpperCase(), "fr");
    const code = sent.findLast((s) => s.to === email)!.code;
    expect(code).toMatch(/^\d{6}$/);
    await expect(verifyEmailSignIn(email, "000000" === code ? "111111" : "000000", "fr")).rejects.toThrow("INVALID_CODE");
    const userId = await verifyEmailSignIn(email, code, "fr");
    users.push(userId);
    const u = await db.user.findUniqueOrThrow({ where: { id: userId } });
    expect(u.email).toBe(email);
    expect(u.emailVerified).toBeInstanceOf(Date);
    expect(u.preferredLocale).toBe("fr");
    // A used code cannot be replayed.
    await expect(verifyEmailSignIn(email, code, "fr")).rejects.toThrow("INVALID_CODE");

    await startEmailSignIn(email, "fr");
    const second = sent.findLast((s) => s.to === email)!.code;
    const wrong = second === "123456" ? "654321" : "123456";
    for (let i = 0; i < 5; i++) await expect(verifyEmailSignIn(email, wrong, "fr")).rejects.toThrow("INVALID_CODE");
    await expect(verifyEmailSignIn(email, second, "fr")).rejects.toThrow("INVALID_CODE");
    // Same account on later sign-ins.
    await startEmailSignIn(email, "fr");
    expect(await verifyEmailSignIn(email, sent.findLast((s) => s.to === email)!.code, "fr")).toBe(userId);
  });

  it("limits how many codes one address can request", async () => {
    const email = `${randomUUID()}@mobile.example.com`;
    for (let i = 0; i < 5; i++) await startEmailSignIn(email, "en");
    await expect(startEmailSignIn(email, "en")).rejects.toThrow("TOO_MANY_CODES");
    await expect(startEmailSignIn("not an email", "en")).rejects.toThrow("INVALID_EMAIL");
  });

  it("ends app sessions on sign-out, suspension, and sign out everywhere", async () => {
    const u = await user("Session");
    const token = await createMobileSession(u.id);
    expect((await resolveMobileSession(token))?.user.id).toBe(u.id);
    expect(await db.mobileSession.findFirst({ where: { tokenHash: token } })).toBeNull();
    await db.user.update({ where: { id: u.id }, data: { sessionVersion: { increment: 1 } } });
    expect(await resolveMobileSession(token)).toBeNull();
    const second = await createMobileSession(u.id);
    await revokeMobileSession(second);
    expect(await resolveMobileSession(second)).toBeNull();
    const third = await createMobileSession(u.id);
    await db.user.update({ where: { id: u.id }, data: { suspendedAt: new Date() } });
    expect(await resolveMobileSession(third)).toBeNull();
    await expect(requireMobileActor(third, "registry:create")).rejects.toThrow("SIGNED_OUT");
    expect(await resolveMobileSession("x".repeat(43))).toBeNull();
  });

  it("links Google to the account that already uses the email, once", async () => {
    const u = await user("Existing");
    const sub = randomUUID();
    expect(await signInWithGoogle({ sub, email: u.email, name: "Google Name", picture: null }, "en")).toBe(u.id);
    expect(await signInWithGoogle({ sub, email: u.email, name: "Google Name", picture: null }, "en")).toBe(u.id);
    expect(await db.account.count({ where: { userId: u.id, provider: "google" } })).toBe(1);
    const fresh = await signInWithGoogle({ sub: randomUUID(), email: `${randomUUID()}@example.com`, name: "New", picture: null }, "ht");
    users.push(fresh);
    expect((await db.user.findUniqueOrThrow({ where: { id: fresh } })).name).toBe("New");
  });
});

describe.skipIf(!run)("lists and pledges from the app on PostgreSQL", () => {
  it("creates a list with place and privacy, and only its owner can change it", async () => {
    const owner = await user("Owner"), other = await user("Other");
    const { slug } = await createList(owner.id, { type: "BIRTHDAY", title: "50 an Tonton Joel", visibility: "LINK", place: "Jacmel", eventDate: "2027-02-06", locale: "ht" });
    const mine = await listMine(owner.id);
    expect(mine.find((l) => l.slug === slug)).toMatchObject({ status: "DRAFT", visibility: "LINK", place: "Jacmel", eventDate: "2027-02-06" });
    await expect(updateList(other.id, slug, { title: "Hijacked" })).rejects.toThrow("Registry not found");
    await expect(publishList(owner.id, slug)).rejects.toThrow("Add at least one gift before publishing");
    await updateList(owner.id, slug, { visibility: "PUBLIC", eventDate: "" });
    const r = await db.registry.findUniqueOrThrow({ where: { slug } });
    expect([r.visibility, r.searchable, r.isPublic, r.eventDate]).toEqual(["PUBLIC", true, true, null]);
    // Drafts are invisible to others.
    expect(await viewList(slug, other.id)).toBeNull();
  });

  it("counts a pledge as given, never beyond what is needed, and lets the guest take it back", async () => {
    const owner = await user("Rose"), guest = await user("Fabiola"), late = await user("Late");
    const { slug, giftId } = await publishedList(owner.id, 3);
    await pledgeGift(guest.id, giftId, { quantity: 2, message: "Bon maryaj" });
    let item = await db.registryItem.findUniqueOrThrow({ where: { id: giftId } });
    expect([item.fulfilledQty, item.status]).toEqual([2, "PARTIALLY_FULFILLED"]);
    await expect(pledgeGift(late.id, giftId, { quantity: 2 })).rejects.toThrow("NOT_ENOUGH");
    await expect(pledgeGift(owner.id, giftId, { quantity: 1 })).rejects.toThrow("OWN_LIST");
    await expect(pledgeGift(guest.id, giftId, { quantity: 1, price: 0 })).rejects.toThrow("INVALID");

    // Two guests race for the last unit: exactly one wins.
    const results = await Promise.allSettled([pledgeGift(late.id, giftId, { quantity: 1 }), pledgeGift(guest.id, giftId, { quantity: 1, anonymous: true })]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    item = await db.registryItem.findUniqueOrThrow({ where: { id: giftId } });
    expect([item.fulfilledQty, item.status]).toEqual([3, "FULFILLED"]);

    // The owner sees who gave, except anyone who chose to stay anonymous; guests see no names.
    const ownerView = (await viewList(slug, owner.id))!;
    const names = (ownerView.pledges ?? []).map((p) => (p.isAnonymous ? null : p.name));
    expect(names).toContain("Fabiola");
    expect(JSON.stringify(await viewList(slug, late.id))).not.toContain("Fabiola");
    // A given gift cannot be removed.
    await expect(removeGift(owner.id, slug, giftId)).rejects.toThrow("cannot be changed");

    const mine = await listOwnPledges(guest.id);
    const first = mine.find((p) => p.quantity === 2)!;
    await expect(cancelPledge(late.id, first.id)).rejects.toThrow("NOT_FOUND");
    await cancelPledge(guest.id, first.id);
    await expect(cancelPledge(guest.id, first.id)).rejects.toThrow("NOT_FOUND");
    item = await db.registryItem.findUniqueOrThrow({ where: { id: giftId } });
    expect([item.fulfilledQty, item.status]).toEqual([1, "PARTIALLY_FULFILLED"]);
  });

  it("refuses pledges on drafts and private lists", async () => {
    const owner = await user("Owner"), guest = await user("Guest");
    const { giftId, slug } = await publishedList(owner.id, 1, "PRIVATE");
    await expect(pledgeGift(guest.id, giftId, { quantity: 1 })).rejects.toThrow("UNAVAILABLE");
    expect(await viewList(slug, guest.id)).toBeNull();
    const draft = await createList(owner.id, { type: "OTHER", title: "Draft list", visibility: "PUBLIC", locale: "en" });
    await addGifts(owner.id, draft.slug, { custom: { title: "Cake", quantity: 1 } });
    const draftGift = (await viewList(draft.slug, owner.id))!.items[0].id;
    await expect(pledgeGift(guest.id, draftGift, { quantity: 1 })).rejects.toThrow("UNAVAILABLE");
  });

  it("finds public lists by name and link-only lists only by link", async () => {
    const owner = await user("Searchable Owner");
    const pub = await publishedList(owner.id, 1, "PUBLIC");
    const link = await publishedList(owner.id, 1, "LINK");
    const title = (await viewList(pub.slug, null))!.title;
    expect((await searchLists(title, "http://localhost:3000")).map((l) => l.slug)).toContain(pub.slug);
    const linkTitle = (await viewList(link.slug, null))!.title;
    expect((await searchLists(linkTitle, "http://localhost:3000")).map((l) => l.slug)).not.toContain(link.slug);
    expect((await searchLists(`http://localhost:3000/ht/r/${link.slug}`, "http://localhost:3000")).map((l) => l.slug)).toEqual([link.slug]);
  });

  it("lets a shop owner change only their own stock, and the catalog shows what is left", async () => {
    const owner = await user("Shop"), other = await user("Other shop");
    await db.user.updateMany({ where: { id: { in: [owner.id, other.id] } }, data: { role: "BUSINESS_OWNER" } });
    const shop = await db.business.create({ data: { ownerId: owner.id, name: "Kay Kizin", slug: `kay-${randomUUID()}`, category: "kitchen", status: "APPROVED" } });
    await db.business.create({ data: { ownerId: other.id, name: "Other", slug: `other-${randomUUID()}`, category: "kitchen", status: "APPROVED" } });
    const product = await db.product.create({ data: { businessId: shop.id, name: "Chodye", priceHTG: "5425.00", priceUSD: "31.00", stockQuantity: 4 } });
    await setStock(owner.id, product.id, 2);
    expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity).toBe(2);
    await expect(setStock(other.id, product.id, 50)).rejects.toThrow("Product not found");
    const c = await catalog();
    expect(c.products.find((p) => p.id === product.id)).toMatchObject({ businessSlug: shop.slug, stockQuantity: 2, priceHTG: 5425 });
  });
});
