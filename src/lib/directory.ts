import { z } from "zod";
import { entityIdSchema } from "./validators/entity-id";
export const businessCategories = ["furniture", "electronics", "clothing", "jewelry", "food", "beauty", "home", "baby", "other"] as const;
export const directorySchema = z.strictObject({
  q: z.string().trim().max(80).default(""),
  category: z.enum(["", ...businessCategories]).default(""),
  after: entityIdSchema.optional(),
});
export type DirectoryInput = z.infer<typeof directorySchema>;
export function directoryHref(input: DirectoryInput, after?: string) {
  const query = new URLSearchParams();
  if (input.q) query.set("q", input.q);
  if (input.category) query.set("category", input.category);
  if (after) query.set("after", after);
  return `/browse${query.size ? `?${query}` : ""}`;
}
