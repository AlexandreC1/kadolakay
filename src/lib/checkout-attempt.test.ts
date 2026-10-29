import { describe, expect, it } from "vitest";
import { checkoutAttempt, clearCheckoutAttempt } from "./checkout-attempt";

describe("checkout attempt persistence", () => {
  it("reuses a random capability after a reload without storing buyer details", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
    const first = checkoutAttempt(storage, "birthday");
    expect(checkoutAttempt(storage, "birthday")).toBe(first);
    expect(checkoutAttempt(storage, "wedding")).not.toBe(first);
    expect(values.get("kadolakay:checkout:v1:birthday")).toBe(first);
    clearCheckoutAttempt(storage, "birthday");
    expect(checkoutAttempt(storage, "birthday")).not.toBe(first);
  });
  it("recovers from malformed or blocked storage and keeps the page attempt stable", () => {
    const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    const first = checkoutAttempt(broken, "birthday");
    expect(checkoutAttempt(broken, "birthday", first)).toBe(first);
    expect(checkoutAttempt({ getItem: () => "<script>", setItem: () => {} }, "birthday")).toMatch(/^[a-f0-9-]{36}$/);
  });
});
