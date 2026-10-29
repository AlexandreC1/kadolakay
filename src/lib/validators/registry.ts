import { z } from "zod";
import { moneyPrice, optionalWebUrl } from "./shared";
import { occasionTypes } from "@/lib/occasions";
const dateField = z.string().refine(v => !v || /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v, "Choose a valid date").optional();
export const createRegistrySchema = z.strictObject({
  type: z.enum(occasionTypes), title: z.string().trim().min(2).max(100),
  description: z.string().max(2000).optional(), eventDate: dateField,
  locale: z.enum(["ht", "fr", "en"]).default("ht"), isPublic: z.boolean().default(true),
  amazonWishlistUrl: optionalWebUrl,
});
export const updateRegistrySchema = createRegistrySchema.partial();
export const addItemSchema = z.strictObject({
  title: z.string().trim().min(1).max(200), description: z.string().max(1000).optional(),
  priceHTG: moneyPrice.optional(), priceUSD: moneyPrice.optional(), quantity: z.number().int().min(1).max(1000).default(1),
  source: z.enum(["CUSTOM", "LOCAL_BUSINESS", "AMAZON", "EXTERNAL"]), externalUrl: optionalWebUrl,
  businessId: z.string().min(1).max(100).optional(), productId: z.string().min(1).max(100).optional(), imageUrl: optionalWebUrl,
});
export const updateItemSchema = addItemSchema.omit({ source: true, businessId: true, productId: true }).partial();
export type CreateRegistryInput = z.infer<typeof createRegistrySchema>;
export type UpdateRegistryInput = z.infer<typeof updateRegistrySchema>;
export type AddItemInput = z.infer<typeof addItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
