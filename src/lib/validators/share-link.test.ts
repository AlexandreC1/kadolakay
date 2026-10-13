import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ registry: { update: vi.fn() } }));
const requireOwner = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/authz", () => ({ requireOwner }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn() }));

import { rotateShareToken } from "@/actions/registry";
import { buildShareUrl } from "@/lib/url";

beforeEach(() => vi.clearAllMocks());

describe("buildShareUrl", () => {
  it("public = plain link, private = ?share=", () => {
    expect(buildShareUrl("https://k.ht/r/a", true, "t")).toBe("https://k.ht/r/a");
    expect(buildShareUrl("https://k.ht/r/a", false, "a b&c")).toBe("https://k.ht/r/a?share=a%20b%26c");
  });
});

describe("rotateShareToken", () => {
  it("requires ownership before writing", async () => {
    requireOwner.mockRejectedValueOnce(new Error("NOT_FOUND"));
    await expect(rotateShareToken("r1")).rejects.toThrow("NOT_FOUND");
    expect(db.registry.update).not.toHaveBeenCalled();
  });
  it("stores and returns a fresh unguessable token", async () => {
    requireOwner.mockResolvedValue({ id: "u1" });
    db.registry.update.mockResolvedValue({ slug: "s" });
    const a = await rotateShareToken("r1");
    const b = await rotateShareToken("r1");
    expect(a).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(a).not.toBe(b);
    expect(requireOwner).toHaveBeenCalledWith("registry", "r1");
    expect(db.registry.update.mock.calls[0][0]).toMatchObject({ where: { id: "r1" }, data: { shareToken: a } });
  });
});
