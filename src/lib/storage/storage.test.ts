import { describe, it, expect } from "vitest";
import { extensionForContentType, getUploadKey } from "./index";

describe("extensionForContentType", () => {
  it("maps allowed image types to safe extensions", () => {
    expect(extensionForContentType("image/jpeg")).toBe("jpg");
    expect(extensionForContentType("image/png")).toBe("png");
    expect(extensionForContentType("image/webp")).toBe("webp");
    expect(extensionForContentType("image/gif")).toBe("gif");
  });

  it("rejects anything not on the allowlist", () => {
    expect(extensionForContentType("image/svg+xml")).toBeNull();
    expect(extensionForContentType("text/html")).toBeNull();
    expect(extensionForContentType("application/octet-stream")).toBeNull();
    expect(extensionForContentType("")).toBeNull();
  });
});

describe("getUploadKey", () => {
  it("uses the content-type extension, never a user-supplied one", () => {
    const key = getUploadKey("registry", "abc123", "image/png");
    expect(key).toMatch(/^uploads\/registry\/abc123\/\d+-[0-9a-f]{24}\.png$/);
  });

  it("includes a random nonce so two simultaneous uploads can't collide", () => {
    const a = getUploadKey("avatar", "u1", "image/jpeg");
    const b = getUploadKey("avatar", "u1", "image/jpeg");
    expect(a).not.toBe(b);
  });

  it("falls back to .bin for unknown types (defense in depth)", () => {
    const key = getUploadKey("product", "p1", "application/x-evil");
    expect(key.endsWith(".bin")).toBe(true);
  });
});
