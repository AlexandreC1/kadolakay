import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ actor: vi.fn(), add: vi.fn(), invalidate: vi.fn() }));
vi.mock("@/services/authorization", () => ({ requireActor: mocks.actor }));
vi.mock("@/services/registry-catalog", async importOriginal => {
  const original = await importOriginal<typeof import("@/services/registry-catalog")>();
  return { ...original, addCatalogGifts: mocks.add };
});
vi.mock("next/cache", () => ({ revalidatePath: mocks.invalidate }));
import { addBusinessProductsToRegistry } from "./registry-item";
import { CatalogSelectionError } from "@/services/registry-catalog";

describe("bulk catalog action authorization and bounded responses", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.actor.mockResolvedValue({ id: "session-owner", role: "USER" }); mocks.add.mockResolvedValue({ addedCount: 2 }); });
  it("binds the write to the fresh session actor and returns only the added count", async () => {
    const input = { registryId: "registry", productIds: ["first", "second"] };
    expect(await addBusinessProductsToRegistry(input)).toEqual({ ok: true, addedCount: 2 });
    expect(mocks.add).toHaveBeenCalledWith("session-owner", input);
    expect(mocks.invalidate).toHaveBeenCalled();
  });
  it("does not invoke the catalog service when authentication rejects the request", async () => {
    mocks.actor.mockRejectedValue(new Error("Please sign in"));
    await expect(addBusinessProductsToRegistry({ registryId: "registry", productIds: ["first"] })).rejects.toThrow("Please sign in");
    expect(mocks.add).not.toHaveBeenCalled(); expect(mocks.invalidate).not.toHaveBeenCalled();
  });
  it.each(["INVALID_SELECTION", "REGISTRY_UNAVAILABLE", "GIFT_ALREADY_ADDED", "PRODUCT_UNAVAILABLE"] as const)("returns a safe expected failure code %s without invalidating", async code => {
    mocks.add.mockRejectedValue(new CatalogSelectionError(code));
    expect(await addBusinessProductsToRegistry({ registryId: "registry", productIds: ["first"] })).toEqual({ ok: false, code });
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
  it("does not convert an unexpected database failure into a successful result or expose its message", async () => {
    mocks.add.mockRejectedValue(new Error("Database operation failed"));
    await expect(addBusinessProductsToRegistry({ registryId: "registry", productIds: ["first"] })).rejects.toThrow("Database operation failed");
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
});
