import { z } from "zod";
import { optionalImageUrl, optionalSafeHttpUrl } from "@/lib/url";

const text = (max: number) => z.string().trim().max(max).optional();
const phone = z.string().trim().regex(/^\+?[0-9\s()-]{6,30}$/).optional();

export const registerBusinessSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().max(2000).optional(),
  category: z.string().trim().min(1).max(50),
  city: text(100),
  department: text(100),
  address: text(300),
  phone,
  whatsapp: phone,
  email: z.union([z.literal(""), z.string().trim().email().max(254)]).optional(),
  website: optionalSafeHttpUrl,
  moncashNumber: phone,
  natcashNumber: phone,
});

const price = z.coerce.number().positive().max(10_000_000).multipleOf(0.01);

export const addProductSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(1000).optional(),
  priceHTG: price.optional(),
  priceUSD: price.optional(),
  category: text(50),
  imageUrl: optionalImageUrl,
});

export const updateProductSchema = addProductSchema.extend({ inStock: z.boolean().optional() }).partial().strict();

export type RegisterBusinessInput = z.infer<typeof registerBusinessSchema>;
export type AddProductInput = z.infer<typeof addProductSchema>;
