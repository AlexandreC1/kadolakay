import { z } from "zod";

export const checkoutSchema = z.object({
  registryItemIds: z.array(z.string().regex(/^[A-Za-z0-9_-]{1,64}$/)).min(1).max(50),
  quantities: z.record(z.string().max(64), z.number().int().positive().max(100)),
  buyerName: z.string().trim().min(1).max(100),
  buyerEmail: z.string().trim().email().max(254),
  buyerPhone: z.string().trim().regex(/^\+?[0-9\s()-]{6,30}$/).optional(),
  giftMessage: z.string().max(500).optional(),
  isAnonymous: z.boolean().default(false),
  paymentProvider: z.enum(["stripe", "paypal", "moncash", "natcash"]),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
