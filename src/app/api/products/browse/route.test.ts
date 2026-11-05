import { describe, expect, it, vi } from "vitest";
const browseProducts = vi.hoisted(() => vi.fn());
vi.mock("@/lib/queries/browse", () => ({ browseProducts }));
import { GET } from "./route";
describe("public product catalogue cache", () => {
  it("does not retain stale merchant products in shared caches", async () => {
    browseProducts.mockResolvedValue({ items: [], nextCursor: null });
    const response = await GET(new Request("http://localhost/api/products/browse?q=crib"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(browseProducts).toHaveBeenCalledWith(expect.any(Object), "crib");
  });
});
