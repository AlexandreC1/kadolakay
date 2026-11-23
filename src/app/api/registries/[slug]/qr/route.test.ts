import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const generate = vi.hoisted(() => vi.fn());
const limit = vi.hoisted(() => vi.fn());
vi.mock("@/services/registry-qr", () => ({ createPublicRegistryQr: generate }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: limit }));
import { GET } from "./route";
const context = { params: Promise.resolve({ slug: "our-wedding" }) };
describe("public registry QR endpoint", () => {
  beforeEach(() => { generate.mockReset(); limit.mockReset(); limit.mockResolvedValue({ ok: true }); vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://kadolakay.example"); });
  afterEach(() => { vi.unstubAllEnvs(); });
  it("uses the configured origin, returns PNG with no shared cache or sniffing", async () => {
    generate.mockResolvedValue(Buffer.from("png"));
    const response = await GET(new Request("https://hostile.example/api/registries/our-wedding/qr?locale=fr"), context);
    expect(generate).toHaveBeenCalledWith("our-wedding", "fr", "https://kadolakay.example");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
  it.each(["?url=https://evil.example", "?locale=en&locale=fr", "?locale=invalid"])("rejects unsupported or duplicate parameters: %s", async query => {
    expect((await GET(new Request(`https://kadolakay.example/api/registries/our-wedding/qr${query}`), context)).status).toBe(400);
    expect(generate).not.toHaveBeenCalled();
  });
  it("does not distinguish missing, private or unpublished lists", async () => {
    generate.mockResolvedValue(null);
    expect((await GET(new Request("https://kadolakay.example/api/registries/our-wedding/qr"), context)).status).toBe(404);
  });
  it("returns a generic retryable response without leaking internal errors", async () => {
    generate.mockImplementation(async () => { throw new Error("database password must not escape"); });
    const response = await GET(new Request("https://kadolakay.example/api/registries/our-wedding/qr"), context);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "QR_UNAVAILABLE" });
  });
  it.each([{ unavailable: false, status: 429, error: "RATE_LIMITED" }, { unavailable: true, status: 503, error: "QR_UNAVAILABLE" }])("stops rendering when the rate limit blocks a request", async ({ unavailable, status, error }) => {
    limit.mockResolvedValue({ ok: false, unavailable });
    const response = await GET(new Request("https://kadolakay.example/api/registries/our-wedding/qr"), context);
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(generate).not.toHaveBeenCalled();
    expect(limit).toHaveBeenCalledWith("general", expect.stringMatching(/^registry-qr:/));
  });
});
