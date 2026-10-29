import { z } from "zod";

export const checkoutSchema = z.strictObject({
  registrySlug: z.string().min(1).max(150),
  locale: z.enum(["ht", "fr", "en"]),
  registryItemIds: z.array(z.string().min(1).max(100)).min(1).max(50),
  quantities: z.record(z.string(), z.number().int().min(1).max(100)),
  buyerName: z.string().trim().min(1).max(100),
  buyerEmail: z.string().trim().email().max(254),
  buyerPhone: z.string().trim().max(30).optional(),
  giftMessage: z.string().trim().max(500).optional(),
  isAnonymous: z.boolean().default(false),
  paymentProvider: z.literal("stripe"),
}).superRefine((data, ctx) => {
  const ids = new Set(data.registryItemIds);
  if (ids.size !== data.registryItemIds.length ||
      Object.keys(data.quantities).length !== ids.size ||
      Object.keys(data.quantities).some((id) => !ids.has(id)) ||
      data.registryItemIds.some((id) => !data.quantities[id])) {
    ctx.addIssue({ code: "custom", message: "Select each item once and provide its quantity." });
  }
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
