import { describe, expect, it } from "vitest";
import { formatEventDate } from "./event-date";
describe("registry calendar dates", () => {
  it("keeps the stored day in preview and public views regardless of server timezone", () => {
    expect(formatEventDate("2026-09-20T00:00:00.000Z", "en")).toBe("September 20, 2026");
    expect(formatEventDate(new Date("2026-01-01T00:00:00.000Z"), "en")).toBe("January 1, 2026");
  });
  it("uses the same day in the French and Creole locale conventions", () => {
    expect(formatEventDate("2026-09-20", "fr")).toBe("20 septembre 2026");
    expect(formatEventDate("2026-09-20", "ht")).toBe("20 septanm 2026");
  });
});
