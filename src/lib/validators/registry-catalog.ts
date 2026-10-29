import { z } from "zod";
import { entityIdSchema } from "./entity-id";

export const catalogSelectionSchema = z.strictObject({
  registryId: entityIdSchema,
  productIds: z.array(entityIdSchema).min(1).max(20)
    .refine(ids => new Set(ids).size === ids.length, "Choose each product once"),
});

export type CatalogSelection = z.infer<typeof catalogSelectionSchema>;
