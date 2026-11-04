import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  discoverySchema,
  preferredCategories,
  rankGifts,
  selectGiftBundle,
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
  // LIKE wildcards in the visitor's text are escaped, so "%" or "_" match themselves.
  const pattern = parsed.q
    ? `%${parsed.q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`
    : null;
  const text = pattern
    ? Prisma.sql`AND (p.name ILIKE ${pattern} OR b.name ILIKE ${pattern})`
    : Prisma.empty;
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
    WITH eligible AS (
      SELECT p.id,p.name,COALESCE(p.category,b.category) AS category,${price} AS amount,p."imageUrl",p."businessId",b.name AS "businessName",${score} AS relevance
      FROM products p JOIN businesses b ON b.id=p."businessId" JOIN users u ON u.id=b."ownerId"
      WHERE b.status='APPROVED' AND u."suspendedAt" IS NULL AND p."inStock"=true AND p."stockQuantity">p."reservedStock"
       AND ${price}>0 AND ${price}<=${fromMinorUnits(toMinorUnits(parsed.budget))}::numeric
       ${text}
    ), bands AS (
      SELECT *, ROW_NUMBER() OVER(PARTITION BY CASE WHEN amount<=${fromMinorUnits(toMinorUnits(parsed.budget))}::numeric/3 THEN 0 WHEN amount<=${fromMinorUnits(toMinorUnits(parsed.budget))}::numeric*2/3 THEN 1 ELSE 2 END ORDER BY relevance DESC,amount DESC,id ASC) AS band_rank FROM eligible
    )
    SELECT id,name,category,amount::text,"imageUrl","businessId","businessName" FROM bands WHERE band_rank<=32 ORDER BY relevance DESC,amount DESC,id ASC LIMIT 96
  `);
  return (
    parsed.budgetMode === "basket"
      ? selectGiftBundle(candidates, parsed)
      : rankGifts(candidates, parsed)
  ).map((p) => ({
    ...p,
    imageUrl:
      p.imageUrl && optionalWebUrl.safeParse(p.imageUrl).success
        ? p.imageUrl
        : null,
  }));
}
