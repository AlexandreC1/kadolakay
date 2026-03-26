import { z } from "zod";

export const registerBusinessSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  category: z.string().min(1),
  city: z.string().optional(),
  department: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  moncashNumber: z.string().optional(),
  natcashNumber: z.string().optional(),
});

export const addProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  priceHTG: z.number().positive().optional(),
  priceUSD: z.number().positive().optional(),
  category: z.string().optional(),
  imageUrl: z.string().optional(),
});

export type RegisterBusinessInput = z.infer<typeof registerBusinessSchema>;
export type AddProductInput = z.infer<typeof addProductSchema>;
