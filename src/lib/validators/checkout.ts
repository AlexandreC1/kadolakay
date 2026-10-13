import { timingSafeEqual } from "node:crypto";
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

/**
 * Who may buy from a registry: it must be PUBLISHED, and a private registry
 * additionally needs its share token (same rule as the registry page, WS3).
 */
export function checkoutAccessAllowed(
  registry: { status: string; isPublic: boolean; shareToken: string },
  shareToken?: string | null,
): boolean {
  if (registry.status !== "PUBLISHED") return false;
  if (registry.isPublic) return true;
  if (!shareToken) return false;
  const a = Buffer.from(shareToken);
  const b = Buffer.from(registry.shareToken);
  return a.length === b.length && timingSafeEqual(a, b);
}
