import { z } from "zod";

export const checkoutSchema = z.object({
  registryItemIds: z.array(z.string()).min(1),
  quantities: z.record(z.string(), z.number().int().positive()),
  buyerName: z.string().min(1).max(100),
  buyerEmail: z.string().email(),
  buyerPhone: z.string().optional(),
  giftMessage: z.string().max(500).optional(),
  isAnonymous: z.boolean().default(false),
  paymentProvider: z.enum(["stripe", "paypal", "moncash", "natcash"]),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
