import { describe, expect, it } from "vitest";
import { performMutation } from "./client-mutation";

describe("mutation error boundary", () => {
  it("reports success only after the server action resolves", async () => {
    expect(await performMutation(async () => undefined)).toBe(true);
  });
  it("returns bounded failure without propagating raw database exceptions", async () => {
    expect(await performMutation(async () => { throw new Error("private database credentials"); })).toBe(false);
  });
  it("preserves Next redirect control flow", async () => {
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/ht/dashboard;307;" });
    await expect(performMutation(async () => { throw redirect; })).rejects.toBe(redirect);
  });
  it("preserves Next not-found control flow", async () => {
    const missing = Object.assign(new Error("NEXT_HTTP_ERROR_FALLBACK"), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
    await expect(performMutation(async () => { throw missing; })).rejects.toBe(missing);
  });
});
