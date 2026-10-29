import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ actor: vi.fn(), create: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/services/authorization", () => ({ requireActor: mocks.actor }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/services/registry", () => ({ createRegistryForUser: mocks.create }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { createRegistryDraft as createRegistry, createRegistry as createLegacyRegistry } from "./registry";
function form() {
  const input = new FormData();
  for (const [key, value] of Object.entries({ type: "BABY_SHOWER", title: "New baby list", description: "Welcome to the family.", eventDate: "2027-06-28", locale: "en", amazonWishlistUrl: "" })) input.set(key, value);
  return input;
}
describe("draft creation action", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.actor.mockResolvedValue({ id: "real-owner", role: "USER" }); mocks.create.mockResolvedValue({ slug: "new-baby-list" }); });
  it("creates a draft with the optional store link empty and binds ownership to the session", async () => {
    expect(await createRegistry(form())).toEqual({ ok: true, destination: "/en/r/new-baby-list/edit" });
    expect(mocks.create).toHaveBeenCalledWith("real-owner", expect.objectContaining({ amazonWishlistUrl: "", eventDate: "2027-06-28", isPublic: true }));
  });
  it("returns specific field errors for a malformed store link without creating anything", async () => {
    const input = form(); input.set("amazonWishlistUrl", "not a URL");
    expect(await createRegistry(input)).toEqual({ ok: false, code: "INVALID_DETAILS", fields: ["amazonWishlistUrl"] });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("distinguishes an expired session and rate limiting from field errors", async () => {
    mocks.actor.mockRejectedValueOnce(new Error("Please sign in to continue"));
    expect(await createRegistry(form())).toEqual({ ok: false, code: "AUTH_REQUIRED", fields: [] });
    mocks.actor.mockRejectedValueOnce(new Error("Please wait a minute and try again"));
    expect(await createRegistry(form())).toEqual({ ok: false, code: "RATE_LIMITED", fields: [] });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("rejects unknown and duplicate form fields before persistence", async () => {
    const unknown = form(); unknown.set("userId", "victim");
    expect((await createRegistry(unknown)).ok).toBe(false);
    const duplicate = form(); duplicate.append("title", "Second title");
    expect((await createRegistry(duplicate)).ok).toBe(false);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("does not expose private database details", async () => {
    mocks.create.mockRejectedValue(new Error("private database connection details"));
    expect(await createRegistry(form())).toEqual({ ok: false, code: "SAVE_FAILED", fields: [] });
  });
  it("does not report failure after the database insert has committed", async () => {
    mocks.revalidate.mockImplementation(() => { throw new Error("cache unavailable"); });
    const warn = vi.spyOn(console, "error").mockImplementation(() => {});
    try { expect(await createRegistry(form())).toEqual({ ok: true, destination: "/en/r/new-baby-list/edit" }); expect(mocks.create).toHaveBeenCalledTimes(1); }
    finally { warn.mockRestore(); }
  });
  it("preserves redirect behavior for previously opened forms", async () => {
    await expect(createLegacyRegistry(form())).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
});
