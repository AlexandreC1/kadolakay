import { describe, it, expect, vi, afterEach } from "vitest";
import { redact, redactString, log, REDACTED } from "./log";

afterEach(() => vi.restoreAllMocks());

describe("redact", () => {
  it("masks sensitive keys at any depth", () => {
    const out = redact({
      orderId: "ord_1",
      buyerEmail: "a@b.co",
      nested: { phone: "+509 3712-3456", giftMessage: "hi", headers: { authorization: "Bearer x" } },
    }) as Record<string, any>;
    expect(out.orderId).toBe("ord_1");
    expect(out.buyerEmail).toBe(REDACTED);
    expect(out.nested.phone).toBe(REDACTED);
    expect(out.nested.giftMessage).toBe(REDACTED);
    expect(out.nested.headers.authorization).toBe(REDACTED);
  });
  it("masks PII and secrets inside free text", () => {
    const s = redactString("mail jean@example.ht or call +509 3712-3456, key sk_live_abcdefghij12, Bearer abc.def");
    expect(s).not.toContain("jean@example.ht");
    expect(s).not.toContain("3712-3456");
    expect(s).not.toContain("sk_live_abcdefghij12");
    expect(s).not.toContain("abc.def");
  });
  it("leaves dates, ids and amounts alone", () => {
    expect(redactString("2026-10-12T20:45:00.000Z order KL-20261012-AB12 total 1250.00")).toBe(
      "2026-10-12T20:45:00.000Z order KL-20261012-AB12 total 1250.00"
    );
  });
  it("serializes errors without leaking message PII and survives cycles", () => {
    const a: Record<string, unknown> = { name: "x" };
    a.self = a;
    expect(() => redact(a)).not.toThrow();
    const e = redact(new Error("failed for bob@x.com")) as { message: string };
    expect(e.message).toBe("failed for [EMAIL]");
  });
});

describe("log", () => {
  it("emits one JSON line with redacted context", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    log.error("payment failed", { orderId: "o1", buyerEmail: "a@b.co" });
    const line = JSON.parse(spy.mock.calls[0][0] as string);
    expect(line).toMatchObject({ level: "error", msg: "payment failed", orderId: "o1", buyerEmail: REDACTED });
  });
});
