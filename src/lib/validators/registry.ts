import { z } from "zod";
import { optionalImageUrl, optionalSafeHttpUrl, isAmazonUrl } from "@/lib/url";

const DAY = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD (or full ISO) within [1 year ago, 5 years ahead]. Invalid dates no longer reach new Date(). */
const eventDate = z
  .string()
  .trim()
  .max(40)
  .refine((v) => {
    const t = Date.parse(v);
    return Number.isFinite(t) && t > Date.now() - 366 * DAY && t < Date.now() + 5 * 366 * DAY;
  }, { message: "Invalid event date" });

const price = z.coerce.number().positive().max(10_000_000).multipleOf(0.01);

export const createRegistrySchema = z.object({
  type: z.enum(["BABY_SHOWER", "WEDDING", "BIRTHDAY"]),
  title: z.string().trim().min(2).max(100),
  description: z.string().max(2000).optional(),
  eventDate: eventDate.optional(),
  locale: z.enum(["ht", "fr", "en"]).default("ht"),
  isPublic: z.boolean().default(true),
  amazonWishlistUrl: optionalSafeHttpUrl.refine((v) => v === undefined || isAmazonUrl(v), {
    message: "Must be an Amazon wishlist URL",
  }),
});

// .strict(): unknown keys (status, userId, slug, shareToken…) are an error, not silently written.
export const updateRegistrySchema = createRegistrySchema.partial().strict();

/**
 * Items a user adds by hand. LOCAL_BUSINESS items, and the businessId/productId
 * links, are only created by addBusinessProductToRegistry (from a real product),
 * so a user can't attach a business name to an arbitrary price.
 */
export const addItemSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(1000).optional(),
  priceHTG: price.optional(),
  priceUSD: price.optional(),
  quantity: z.coerce.number().int().positive().max(1000).default(1),
  source: z.enum(["CUSTOM", "AMAZON", "EXTERNAL"]).default("CUSTOM"),
  externalUrl: optionalSafeHttpUrl,
  imageUrl: optionalImageUrl,
});

export const updateItemSchema = addItemSchema.omit({ source: true }).partial().strict();

export type CreateRegistryInput = z.infer<typeof createRegistrySchema>;
export type UpdateRegistryInput = z.infer<typeof updateRegistrySchema>;
export type AddItemInput = z.infer<typeof addItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
