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

describe("storage keys from public URLs", async () => {
  const { storageKeyFromUrl, storageConfigured } = await import("./index");
  const env = { S3_PUBLIC_URL: "https://cdn.example.org/" };
  const key = "uploads/registry/clxyz123/1793627682000-0123456789abcdef01234567.webp";
  it("returns only keys this app minted, under its own public URL", () => {
    expect(storageKeyFromUrl(`https://cdn.example.org/${key}`, env)).toBe(key);
    for (const url of [
      `https://evil.example.org/${key}`,
      "https://lh3.googleusercontent.com/a/photo",
      "https://cdn.example.org/uploads/registry/x/../../secret.webp",
      "https://cdn.example.org/uploads/registry/clxyz123/file.html",
      "https://cdn.example.org/other/clxyz123/1793627682000-0123456789abcdef01234567.webp",
      null,
      "",
    ])
      expect(storageKeyFromUrl(url, env)).toBeNull();
    expect(storageKeyFromUrl(`https://cdn.example.org/${key}`, {})).toBeNull();
  });
  it("recognises every key the upload helper produces", async () => {
    const { getUploadKey } = await import("./index");
    for (const ctx of ["registry", "product", "business", "avatar"] as const)
      for (const type of ["image/jpeg", "image/png", "image/webp", "image/gif"]) {
        const minted = getUploadKey(ctx, "clabc123def", type);
        expect(storageKeyFromUrl(`https://cdn.example.org/${minted}`, env)).toBe(minted);
      }
  });
  it("reports storage as configured only with every setting", () => {
    expect(storageConfigured({ S3_BUCKET: "b", S3_ACCESS_KEY_ID: "a", S3_SECRET_ACCESS_KEY: "s", S3_PUBLIC_URL: "https://c" })).toBe(true);
    expect(storageConfigured({ S3_BUCKET: "b" })).toBe(false);
  });
});
