import { afterEach, describe, expect, it, vi } from "vitest";
import { recordOperationalEvent } from "./operational-events";
describe("bounded operational logs", () => {
  afterEach(() => vi.restoreAllMocks());
  it("emits only bounded metrics and approved labels", () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    recordOperationalEvent("business_review", { outcome: "ok", durationMs: 12.7, count: 1, email: "private@example.invalid", token: "private-token" } as Parameters<typeof recordOperationalEvent>[1]);
    const data = JSON.parse(log.mock.calls[0][0]);
    expect(data).toEqual({ timestamp: expect.any(String), event: "business_review", outcome: "ok", durationMs: 13, count: 1 });
    expect(JSON.stringify(data)).not.toContain("private");
  });
  it("does not accept arbitrary labels or let logging failure undo a transaction", () => {
    const log = vi.spyOn(console, "warn").mockImplementation(() => { throw new Error("logging unavailable"); });
    expect(() => recordOperationalEvent("authorization_denied", { outcome: "denied" })).not.toThrow();
    expect(log).toHaveBeenCalledTimes(1);
    recordOperationalEvent("private-token" as Parameters<typeof recordOperationalEvent>[0], { outcome: "failed" });
    expect(log).toHaveBeenCalledTimes(1);
  });
});
