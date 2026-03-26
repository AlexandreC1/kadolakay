import { z } from "zod";

export const createRegistrySchema = z.object({
  type: z.enum(["BABY_SHOWER", "WEDDING", "BIRTHDAY"]),
  title: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  eventDate: z.string().optional(),
  locale: z.enum(["ht", "fr", "en"]).default("ht"),
  isPublic: z.boolean().default(true),
  amazonWishlistUrl: z.string().url().optional().or(z.literal("")),
});

export const updateRegistrySchema = createRegistrySchema.partial();

export const addItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  priceHTG: z.number().positive().optional(),
  priceUSD: z.number().positive().optional(),
  quantity: z.number().int().positive().default(1),
  source: z.enum(["CUSTOM", "LOCAL_BUSINESS", "AMAZON", "EXTERNAL"]),
  externalUrl: z.string().url().optional().or(z.literal("")),
  businessId: z.string().optional(),
  productId: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const updateItemSchema = addItemSchema.partial();

export type CreateRegistryInput = z.infer<typeof createRegistrySchema>;
export type UpdateRegistryInput = z.infer<typeof updateRegistrySchema>;
export type AddItemInput = z.infer<typeof addItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
