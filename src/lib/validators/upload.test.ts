import { describe, it, expect } from "vitest";
import { uploadRequestSchema } from "./upload";

const valid = {
  context: "registry",
  contextId: "cm1abc23def456ghi789jkl0",
  contentType: "image/png",
  fileSize: 2048,
};

describe("uploadRequestSchema", () => {
  it("accepts a normal request", () => {
    expect(uploadRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a context with no ownership rule", () => {
    // This value used to skip every ownership branch and be allowed.
    expect(uploadRequestSchema.safeParse({ ...valid, context: "x" }).success).toBe(false);
  });

  it("rejects ids that could change the storage path", () => {
    for (const contextId of ["../avatar/victim", "a/b", "..", "", "a".repeat(65)]) {
      expect(uploadRequestSchema.safeParse({ ...valid, contextId }).success).toBe(false);
    }
  });

  it("rejects non-image types and out-of-range sizes", () => {
    expect(uploadRequestSchema.safeParse({ ...valid, contentType: "text/html" }).success).toBe(false);
    expect(uploadRequestSchema.safeParse({ ...valid, fileSize: 10 }).success).toBe(false);
    expect(uploadRequestSchema.safeParse({ ...valid, fileSize: 6 * 1024 * 1024 }).success).toBe(false);
    expect(uploadRequestSchema.safeParse({ ...valid, fileSize: Number.NaN }).success).toBe(false);
  });
});
