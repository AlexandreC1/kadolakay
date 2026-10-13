import { describe, expect, it } from "vitest";
import { isAuthorizedCron } from "./cron-auth";

const S = "s".repeat(40);
const req = (h?: string) => new Request("http://x/api/cron/a", { headers: h ? { authorization: h } : {} });

describe("isAuthorizedCron", () => {
  it("accepts the exact bearer", () => expect(isAuthorizedCron(req(`Bearer ${S}`), S)).toBe(true));
  it("rejects wrong / missing", () => {
    expect(isAuthorizedCron(req(`Bearer ${S}x`), S)).toBe(false);
    expect(isAuthorizedCron(req(), S)).toBe(false);
  });
  it("fails closed when secret unset or short", () => {
    expect(isAuthorizedCron(req("Bearer "), "")).toBe(false);
    expect(isAuthorizedCron(req("Bearer short"), "short")).toBe(false);
    expect(isAuthorizedCron(req("Bearer undefined"), undefined)).toBe(false);
  });
});
