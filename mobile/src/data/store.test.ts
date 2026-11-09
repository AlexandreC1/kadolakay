import { describe, expect, it } from "vitest";
import { availableOf, canPledge, findList, initialState, myLists, reducer, slugFromLink } from "./store";
import type { Registry, User } from "./types";

const user: User = { id: "u1", name: "Marie", email: "m@example.com", locale: "ht", role: "USER", onboarding: "done", business: null };
const list = (slug: string, over: Partial<Registry> = {}): Registry => ({
  slug, ownerId: "u2", ownerName: "Rose", type: "WEDDING", status: "PUBLISHED", title: slug, visibility: "PUBLIC", createdAt: "2026-11-01",
  items: [{ id: `${slug}-g`, title: "Dra", quantity: 3, fulfilledQty: 1, reservedQty: 1, source: "CUSTOM", priority: 0 }],
  ...over,
});

describe("store", () => {
  it("takes the account's language when a saved session is restored", () => {
    const s = reducer(initialState("fr"), { type: "booted", user });
    expect([s.booted, s.user?.id, s.locale]).toEqual([true, "u1", "ht"]);
  });

  it("keeps own lists separate, merges updates, and forgets account data on sign-out", () => {
    let s = reducer(initialState(), { type: "signedIn", user });
    s = reducer(s, { type: "mine", lists: [list("mine-1", { ownerId: "u1", owner: true, pledges: [] })] });
    s = reducer(s, { type: "lists", lists: [list("theirs")] });
    s = reducer(s, { type: "list", list: list("theirs", { title: "Updated" }) });
    expect(myLists(s).map((l) => l.slug)).toEqual(["mine-1"]);
    expect(findList(s, "theirs")?.title).toBe("Updated");
    s = reducer(s, { type: "signOut" });
    expect(s.user).toBeNull();
    expect(findList(s, "mine-1")).toBeUndefined();
    expect(findList(s, "theirs")).toBeDefined();
  });

  it("drops a list the server says is gone", () => {
    let s = reducer(initialState(), { type: "lists", lists: [list("x")] });
    s = reducer(s, { type: "visit", slug: "x" });
    s = reducer(s, { type: "gone", slug: "x" });
    expect([findList(s, "x"), s.visited]).toEqual([undefined, []]);
  });

  it("lets anyone but the owner promise what is still needed on a published list", () => {
    const l = list("w");
    const g = l.items[0];
    expect(availableOf(g).available).toBe(1);
    expect(canPledge(l, g, "u1")).toBe(true);
    expect(canPledge({ ...l, owner: true }, g, "u2")).toBe(false);
    expect(canPledge({ ...l, status: "DRAFT" }, g, "u1")).toBe(false);
    expect(canPledge(l, { ...g, fulfilledQty: 2 }, "u1")).toBe(false);
  });

  it("reads the list slug out of a pasted link", () => {
    expect(slugFromLink("https://kadolakay.vercel.app/ht/r/maryaj-jean-rose")).toBe("maryaj-jean-rose");
    expect(slugFromLink("Maryaj")).toBeNull();
  });
});
