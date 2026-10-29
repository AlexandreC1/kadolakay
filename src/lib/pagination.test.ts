import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/log", () => ({ log: { warn: vi.fn() } }));
import { cursorArgs, pageHref, parsePageRequest, parseSearch, toPage, MAX_PAGE_SIZE } from "./pagination";
import { poolingWarnings } from "./db";

describe("pagination", () => {
  it("clamps take and rejects junk cursors", () => {
    expect(parsePageRequest({ take: "999" }).take).toBe(MAX_PAGE_SIZE);
    expect(parsePageRequest({ take: "-1" }).take).toBe(20);
    expect(parsePageRequest({ cursor: "'; drop table" }).cursor).toBeUndefined();
    expect(parsePageRequest({ cursor: "ckx1_a-B" }).cursor).toBe("ckx1_a-B");
  });
  it("fetches one extra row and reports next cursor", () => {
    expect(cursorArgs({ take: 2, cursor: "c" })).toEqual({ take: 3, cursor: { id: "c" }, skip: 1 });
    expect(toPage([{ id: "a" }, { id: "b" }, { id: "c" }], 2)).toEqual({ items: [{ id: "a" }, { id: "b" }], nextCursor: "b" });
  });
  it("pageHref keeps params and is null at the end", () => {
    expect(pageHref("/orders", { tab: "placed", cursor: "x" }, "n1")).toBe("/orders?tab=placed&cursor=n1");
    expect(pageHref("/orders", {}, null)).toBeNull();
  });
  it("parseSearch trims and caps", () => {
    expect(parseSearch("  ")).toBeUndefined();
    expect(parseSearch("x".repeat(100))).toHaveLength(64);
  });
});

describe("poolingWarnings", () => {
  it("flags unpooled Neon URLs", () => {
    expect(poolingWarnings("postgresql://u:p@ep-x.us-east-2.aws.neon.tech/db")).toHaveLength(3);
    expect(
      poolingWarnings("postgresql://u:p@ep-x-pooler.us-east-2.aws.neon.tech/db?pgbouncer=true&connection_limit=1"),
    ).toEqual([]);
    expect(poolingWarnings("postgresql://u:p@localhost/db")).toEqual([]);
    expect(poolingWarnings(undefined)).toEqual(["DATABASE_URL is not set"]);
  });
});
