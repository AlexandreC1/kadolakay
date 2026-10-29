import { z } from "zod";
import { moneyPrice, optionalWebUrl } from "./shared";
const optionalText = z.string().trim().max(200).optional();
// An identifier, not a number: retain leading zeroes and printed separators.
// This validates safe bounded input, not legal validity or government registration.
export const patenteNumberSchema = z.string().trim().max(100)
  .refine(value => value === "" || /^[\p{L}\p{N} ./_-]+$/u.test(value), "Use letters, numbers, spaces or . / _ -")
  .transform(value => value || null).nullable().optional();
export const registerBusinessSchema = z.strictObject({
  name: z.string().trim().min(2).max(100), description: z.string().max(2000).optional(),
  category: z.string().trim().min(1).max(100), city: optionalText, department: optionalText,
  patenteNumber: patenteNumberSchema,
  address: z.string().max(500).optional(), phone: optionalText, whatsapp: optionalText,
  email: z.string().max(254).email().optional().or(z.literal("")), website: optionalWebUrl,
  moncashNumber: optionalText, natcashNumber: optionalText,
});
const productFields = {
  name: z.string().trim().min(1).max(200), description: z.string().max(1000).optional(),
  priceHTG: moneyPrice.optional(), priceUSD: moneyPrice.optional(), category: optionalText, imageUrl: optionalWebUrl,
};
export const addProductSchema = z.strictObject(productFields).refine(v => v.priceHTG !== undefined || v.priceUSD !== undefined, "Add a price before listing this product");
export const editProductSchema = z.strictObject({ ...productFields, inStock: z.boolean() }).refine(v => v.priceHTG !== undefined || v.priceUSD !== undefined, "Add a price before listing this product");
export type RegisterBusinessInput = z.infer<typeof registerBusinessSchema>;
export type AddProductInput = z.infer<typeof addProductSchema>;
export type EditProductInput = z.infer<typeof editProductSchema>;
