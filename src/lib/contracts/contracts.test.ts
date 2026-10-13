import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  ok, fail, toActionError, runAction, AuthError, ActionError,
  parsePageRequest, cursorArgs, toPage, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE,
  verificationMismatch, ProviderError, getFlags, emailDedupeKey,
} from "./index";
import { money } from "../money";

describe("ActionResult", () => {
  it("builds ok/fail", () => {
    expect(ok({ a: 1 })).toEqual({ ok: true, data: { a: 1 } });
    expect(fail("NOT_FOUND")).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(fail("INVALID_INPUT", "title")).toEqual({ ok: false, error: "INVALID_INPUT", field: "title" });
  });
  it("maps known errors and hides unknown ones", () => {
    expect(toActionError(new AuthError("FORBIDDEN"))).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(toActionError(new ActionError("CONFLICT", "slug"))).toEqual({ ok: false, error: "CONFLICT", field: "slug" });
    const zerr = z.object({ title: z.string() }).safeParse({}).error;
    expect(toActionError(zerr)).toEqual({ ok: false, error: "INVALID_INPUT", field: "title" });
    expect(toActionError(new Error("DB password is hunter2"))).toEqual({ ok: false, error: "INTERNAL" });
  });
  it("runAction reports unexpected errors to the callback only", async () => {
    let seen: unknown;
    expect(await runAction(async () => 5)).toEqual({ ok: true, data: 5 });
    const r = await runAction(async () => { throw new Error("boom"); }, (e) => (seen = e));
    expect(r).toEqual({ ok: false, error: "INTERNAL" });
    expect((seen as Error).message).toBe("boom");
  });
});

describe("pagination", () => {
  it("clamps and sanitizes untrusted input", () => {
    expect(parsePageRequest({ take: "1000" }).take).toBe(MAX_PAGE_SIZE);
    expect(parsePageRequest({ take: "-3" }).take).toBe(DEFAULT_PAGE_SIZE);
    expect(parsePageRequest({ take: "abc" }).take).toBe(DEFAULT_PAGE_SIZE);
    expect(parsePageRequest({ cursor: "../x" }).cursor).toBeUndefined();
    expect(parsePageRequest({ cursor: "ckabc123" }).cursor).toBe("ckabc123");
  });
  it("fetches one extra row and derives nextCursor", () => {
    expect(cursorArgs({ take: 2 })).toEqual({ take: 3 });
    expect(cursorArgs({ take: 2, cursor: "c" })).toEqual({ take: 3, cursor: { id: "c" }, skip: 1 });
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(toPage(rows, 2)).toEqual({ items: [{ id: "a" }, { id: "b" }], nextCursor: "b" });
    expect(toPage(rows, 3)).toEqual({ items: rows, nextCursor: null });
  });
});

describe("payments contract", () => {
  const expected = { orderId: "o1", amount: money("100.00"), currency: "HTG" as const };
  const v = { orderId: "o1", amount: money(100), currency: "HTG" as const, status: "COMPLETED" as const };
  it("accepts an exact match (Decimal equality, not string)", () => {
    expect(verificationMismatch(v, expected)).toBeNull();
  });
  it("rejects every mismatch", () => {
    expect(verificationMismatch({ ...v, status: "PENDING" }, expected)).toBe("NOT_COMPLETED");
    expect(verificationMismatch({ ...v, orderId: "o2" }, expected)).toBe("ORDER_MISMATCH");
    expect(verificationMismatch({ ...v, currency: "USD" }, expected)).toBe("CURRENCY_MISMATCH");
    expect(verificationMismatch({ ...v, amount: money("99.99") }, expected)).toBe("AMOUNT_MISMATCH");
  });
  it("ProviderError carries no response body", () => {
    const e = new ProviderError("PAYPAL", "HTTP_ERROR", 502);
    expect(e.message).toBe("PAYPAL:HTTP_ERROR:502");
  });
});

describe("flags & email keys", () => {
  it("defaults to current behaviour", () => {
    expect(getFlags({} as NodeJS.ProcessEnv)).toEqual({
      stripeEnabled: true, paypalEnabled: true, moncashEnabled: true, natcashEnabled: true,
      emailQueueEnabled: false, maintenanceMode: false,
    });
    expect(getFlags({ NATCASH_ENABLED: "false", EMAIL_QUEUE_ENABLED: "1" } as unknown as NodeJS.ProcessEnv)).toMatchObject({
      natcashEnabled: false, emailQueueEnabled: true,
    });
  });
  it("formats dedupe keys", () => {
    expect(emailDedupeKey("order", "o1", "gift-notification")).toBe("order:o1:gift-notification");
  });
});
