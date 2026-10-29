import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import jsQR from "jsqr";
const preview = vi.hoisted(() => vi.fn());
vi.mock("./registry-finder", () => ({ previewSharedRegistry: preview }));
import { createPublicRegistryQr } from "./registry-qr";
import { registryShareUrl } from "@/lib/registry-share-url";

describe("registry QR sharing", () => {
  beforeEach(() => { preview.mockReset(); });
  it.each(["ht", "fr", "en"])("generates a PNG independently decodable to the exact %s public URL", async locale => {
    preview.mockResolvedValue({ status: "found", registry: { title: "Maryaj Jean & Rose", type: "WEDDING", eventDate: new Date("2026-09-20T00:00:00Z") } });
    const png = await createPublicRegistryQr("our-wedding", locale, "https://kadolakay.example");
    expect(png).not.toBeNull();
    const { data, info } = await sharp(png!).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(info.width).toBe(1200); expect(info.height).toBeGreaterThan(1000);
    expect(jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data).toBe(`https://kadolakay.example${locale === "ht" ? "" : `/${locale}`}/r/our-wedding`);
  });
  it("wraps long titles and literal markup safely while preserving a scannable complete card", async () => {
    preview.mockResolvedValue({ status: "found", registry: { title: '<span foreground="red">Family & friends</span> '.repeat(3), type: "BABY_SHOWER", eventDate: null } });
    const png = await createPublicRegistryQr("a".repeat(100), "fr", "https://kadolakay.example");
    const { data, info } = await sharp(png!).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(info.height).toBeGreaterThan(1200);
    expect(jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data).toBe(`https://kadolakay.example/fr/r/${"a".repeat(100)}`);
    const scaled = await sharp(png!).resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(jsQR(new Uint8ClampedArray(scaled.data), scaled.info.width, scaled.info.height)?.data).toBe(`https://kadolakay.example/fr/r/${"a".repeat(100)}`);
  });
  it("does not generate a QR for an inaccessible registry", async () => {
    preview.mockResolvedValue({ status: "missing" });
    expect(await createPublicRegistryQr("hidden-list", "en", "https://kadolakay.example")).toBeNull();
  });
  it.each(["javascript:alert(1)", "https://user:secret@kadolakay.example", "https://kadolakay.example/?token=secret", "https://kadolakay.example/subpath"])("rejects an unsafe configured origin: %s", base => {
    expect(() => registryShareUrl("our-wedding", "en", base)).toThrow();
  });
  it("rejects invalid slugs/locales instead of encoding arbitrary destinations", () => {
    expect(() => registryShareUrl("../../admin", "en", "https://kadolakay.example")).toThrow();
    expect(() => registryShareUrl("our-wedding", "evil", "https://kadolakay.example")).toThrow();
  });
});
