import { expect, it } from "vitest";
import { webUrl, optionalWebUrl, parseFormFields } from "./shared";
import { addItemSchema, createRegistrySchema, updateItemSchema } from "./registry";
it.each(["javascript:alert(1)", "data:text/html,test", "https://user:secret@example.com"]) ("rejects unsafe URL %s", value => { expect(webUrl.safeParse(value).success).toBe(false); });
it("rejects mass assignment and duplicate fields", () => {
  expect(updateItemSchema.safeParse({ fulfilledQty: 9 }).success).toBe(false);
  const form = new FormData(); form.append("title", "one"); form.append("title", "two");
  expect(() => parseFormFields(form, ["title"])).toThrow();
});
it("rejects impossible dates and fractional quantities", () => {
  expect(createRegistrySchema.safeParse({ type: "WEDDING", title: "Wedding", eventDate: "2026-02-31" }).success).toBe(false);
  expect(addItemSchema.safeParse({ title: "Gift", source: "CUSTOM", quantity: 0.5 }).success).toBe(false);
  expect(addItemSchema.safeParse({ title: "Gift", source: "CUSTOM", priceUSD: 1.001 }).success).toBe(false);
});
it("accepts the reported draft details with a blank optional store link", () => {
  const input = { type: "BABY_SHOWER", title: "New baby list", description: "Welcome to the family.", eventDate: "2027-06-28", locale: "en", amazonWishlistUrl: "" };
  expect(() => createRegistrySchema.safeParse(input)).not.toThrow();
  expect(createRegistrySchema.safeParse(input).success).toBe(true);
});
it.each(["", "   ", undefined])("accepts an optional empty URL: %s", value => {
  expect(optionalWebUrl.safeParse(value).success).toBe(true);
});
it.each(["not a URL", "https://[invalid", "/relative/path", "javascript:alert(1)", "data:text/html,hi", "https://user:password@example.com"])("returns a validation failure instead of throwing for %s", value => {
  expect(() => optionalWebUrl.safeParse(value)).not.toThrow();
  expect(optionalWebUrl.safeParse(value).success).toBe(false);
});
