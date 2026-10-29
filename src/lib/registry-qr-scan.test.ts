import { describe, expect, it } from "vitest";
import QRCode from "qrcode";
import sharp from "sharp";
import { readRegistryQr, validQrImage, QR_IMAGE_MAX_BYTES } from "./registry-qr-scan";

async function scan(text: string) {
  const png = await QRCode.toBuffer(text, { width: 600, margin: 4 });
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return readRegistryQr(new Uint8ClampedArray(data), info.width, info.height, "https://kadolakay.example");
}
describe("guest QR scanner", () => {
  it.each(["en", "fr", "ht"])("reads an actual %s registry QR into an exact-address lookup", async locale => {
    expect(await scan(`https://kadolakay.example/${locale}/r/our-wedding`)).toEqual({ status: "found", slug: "our-wedding" });
  });
  it.each(["https://evil.example/r/our-wedding", "javascript:alert(1)", "https://kadolakay.example/admin", "https://user:secret@kadolakay.example/r/our-wedding", "https://kadolakay.example/r/our-wedding?token=secret"])("rejects an unsafe QR destination: %s", async text => {
    expect(await scan(text)).toEqual({ status: "invalid" });
  });
  it("returns an actionable no-code result for a blank image", async () => {
    expect(await readRegistryQr(new Uint8ClampedArray(100 * 100 * 4).fill(255),100,100,"https://kadolakay.example")).toEqual({ status: "empty" });
  });
  it("bounds file inputs and rejects executable/unsupported image types", () => {
    for (const type of ["image/png", "image/jpeg", "image/webp"]) expect(validQrImage({ type, size: QR_IMAGE_MAX_BYTES })).toBe(true);
    for (const file of [{ type: "image/svg+xml", size: 20 }, { type: "image/gif", size: 20 }, { type: "image/png", size: 0 }, { type: "image/png", size: QR_IMAGE_MAX_BYTES + 1 }]) expect(validQrImage(file)).toBe(false);
  });
});
