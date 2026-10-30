import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  discoverySchema,
  preferredCategories,
  rankGifts,
  type DiscoveryInput,
} from "@/lib/gift-discovery";
import { optionalWebUrl } from "@/lib/validators/shared";
import { fromMinorUnits, toMinorUnits } from "./money";

export async function discoverGifts(input: DiscoveryInput) {
  const parsed = discoverySchema.parse(input);
  const price =
    parsed.currency === "USD"
      ? Prisma.sql`p."priceUSD"`
      : Prisma.sql`p."priceHTG"`;
  const matched = preferredCategories(parsed.occasion);
  const score = matched.length
    ? Prisma.sql`CASE WHEN LOWER(COALESCE(p.category,b.category)) IN (${Prisma.join([...matched])}) THEN 1 ELSE 0 END`
    : Prisma.sql`CAST(0 AS integer)`;
  // One query, explicit public DTO, no full catalog load or per-card requests.
  const candidates = await db.$queryRaw<
    {
      id: string;
      name: string;
      category: string | null;
      amount: string;
      imageUrl: string | null;
      businessId: string;
      businessName: string;
    }[]
  >(Prisma.sql`
    SELECT p.id, p.name, COALESCE(p.category,b.category) AS category, ${price}::text AS amount, p."imageUrl", p."businessId", b.name AS "businessName"
    FROM products p JOIN businesses b ON b.id = p."businessId"
    WHERE b.status = 'APPROVED' AND p."inStock" = true AND p."stockQuantity" > p."reservedStock"
      AND ${price} > 0 AND ${price} <= ${fromMinorUnits(toMinorUnits(parsed.budget))}::numeric
    ORDER BY ${score} DESC, ${price} DESC, p.id ASC LIMIT 96
  `);
  return rankGifts(candidates, parsed).map((p) => ({
    ...p,
    imageUrl:
      p.imageUrl && optionalWebUrl.safeParse(p.imageUrl).success
        ? p.imageUrl
        : null,
  }));
}
