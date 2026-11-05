import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ auth: vi.fn(), create: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/db", () => ({ db: { registry: { create: m.create } } }));
vi.mock("@/lib/slug", () => ({ generateUniqueSlug: vi.fn().mockResolvedValue("test-slug") }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
import { createRegistry } from "./registry";
beforeEach(() => { vi.clearAllMocks(); m.auth.mockResolvedValue({ user: { id: "owner1" } }); m.create.mockResolvedValue({ slug: "test-slug" }); });
describe("registry share tokens", () => {
  it("creates a fresh 192-bit token for each new private registry", async () => {
    const form = new FormData(); form.set("title", "Birthday"); form.set("type", "BIRTHDAY"); form.set("isPublic", "false");
    await createRegistry(form); await createRegistry(form);
    const a = m.create.mock.calls[0][0].data.shareToken;
    const b = m.create.mock.calls[1][0].data.shareToken;
    expect(a).toMatch(/^[A-Za-z0-9_-]{32}$/); expect(a).not.toBe(b);
    expect(m.create.mock.calls[0][0].data).toMatchObject({ userId: "owner1", isPublic: false });
  });
  it("does not create a registry for an unauthenticated request", async () => {
    m.auth.mockResolvedValue(null);
    await expect(createRegistry(new FormData())).rejects.toThrow("Unauthorized");
    expect(m.create).not.toHaveBeenCalled();
  });
});
