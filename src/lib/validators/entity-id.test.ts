import { describe, expect, it } from "vitest";
import { entitySlugSchema, parseEntityId } from "./entity-id";
import { webUrl } from "./shared";

describe("entity identifier boundary", () => {
  it.each(["cm35c8tza0000abcd12345678", "demo-registry", "5d0a0000-1111-2222-3333-123456789abc"])("accepts supported persisted identifiers: %s", (id) => {
    expect(parseEntityId(id)).toBe(id);
  });
  it.each([{ not: "" }, { in: ["another-id"] }, { equals: "id" }, ["id"], null, undefined, 12, "", " id", "../id", "id\n", "x".repeat(101)])("rejects filters and malformed identifiers", (id) => {
    expect(() => parseEntityId(id)).toThrow("Invalid identifier");
  });
  it("bounds route slugs without allowing filter-shaped values", () => {
    expect(entitySlugSchema.safeParse("marie-jean-2026").success).toBe(true);
    expect(entitySlugSchema.safeParse({ not: "" }).success).toBe(false);
    expect(entitySlugSchema.safeParse("../private").success).toBe(false);
  });
});

describe("stored link safety", () => {
  it.each(["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "https://user:secret@example.com", "file:///etc/passwd"])("rejects unsafe links: %s", (url) => {
    expect(webUrl.safeParse(url).success).toBe(false);
  });
});
