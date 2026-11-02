import { z } from "zod";
import { toMinorUnits } from "@/services/money";
export const occasions = [
  "ANY",
  "BIRTHDAY",
  "WEDDING",
  "BABY_SHOWER",
  "CHRISTMAS",
  "VALENTINE",
  "HERITAGE",
] as const;
export const discoverySchema = z
  .object({
    budget: z
      .string()
      .trim()
      .regex(/^\d{1,7}(\.\d{1,2})?$/)
      .refine((v) => Number(v) > 0 && Number(v) <= 1000000)
      .default("100"),
    currency: z.enum(["USD", "HTG"]).default("USD"),
    budgetMode: z.enum(["gift", "basket"]).default("gift"),
    maxGifts: z
      .union([
        z.number(),
        z
          .string()
          .regex(/^\d{1,2}$/)
          .transform(Number),
      ])
      .pipe(z.number().int().min(1).max(12))
      .default(6),
    occasion: z.enum(occasions).default("ANY"),
  })
  .strict();
type ParsedDiscoveryInput = z.infer<typeof discoverySchema>;
export type DiscoveryInput = Pick<
  ParsedDiscoveryInput,
  "budget" | "currency" | "occasion"
> &
  Partial<Pick<ParsedDiscoveryInput, "budgetMode" | "maxGifts">>;
const categories: Record<DiscoveryInput["occasion"], readonly string[]> = {
  ANY: [],
  BIRTHDAY: ["fashion", "clothing", "electronics", "art", "crafts", "beauty"],
  WEDDING: ["home", "furniture", "kitchen", "decor"],
  BABY_SHOWER: ["baby", "kids", "children"],
  CHRISTMAS: ["home", "crafts", "toys", "art"],
  VALENTINE: ["jewelry", "flowers", "beauty", "fashion", "clothing"],
  HERITAGE: ["crafts", "art", "books"],
};
export function occasionMatch(
  category: string | null,
  occasion: DiscoveryInput["occasion"],
) {
  // Match explicit catalog categories; no profiling, popularity claims or paid boosts.
  return Boolean(
    category && categories[occasion].includes(category.toLowerCase()),
  );
}
export function preferredCategories(occasion: DiscoveryInput["occasion"]) {
  return categories[occasion];
}
export type RankedGift = {
  id: string;
  category: string | null;
  amount: string;
  businessId: string;
};
export function rankGifts<T extends RankedGift>(
  candidates: T[],
  input: DiscoveryInput,
): (T & { reason: "occasion" | "budget" })[] {
  const max = toMinorUnits(input.budget);
  const eligible = candidates.filter((p) => {
    try {
      return toMinorUnits(p.amount) > 0 && toMinorUnits(p.amount) <= max;
    } catch {
      return false;
    }
  });
  eligible.sort(
    (a, b) =>
      Number(occasionMatch(b.category, input.occasion)) -
        Number(occasionMatch(a.category, input.occasion)) ||
      toMinorUnits(b.amount) - toMinorUnits(a.amount) ||
      a.id.localeCompare(b.id),
  );
  // Diversify the first pass without making a single-merchant catalog look empty.
  const counts = new Map<string, number>();
  const first: T[] = [],
    rest: T[] = [];
  for (const item of eligible) {
    const count = counts.get(item.businessId) || 0;
    (count < 3 ? first : rest).push(item);
    counts.set(item.businessId, count + 1);
  }
  return [...first, ...rest].slice(0, 12).map((p) => ({
    ...p,
    reason: occasionMatch(p.category, input.occasion) ? "occasion" : "budget",
  }));
}

export function selectGiftBundle<T extends RankedGift>(
  candidates: T[],
  input: DiscoveryInput,
): (T & { reason: "occasion" | "budget" })[] {
  const settings = discoverySchema.parse(input),
    budget = toMinorUnits(settings.budget),
    target = budget / settings.maxGifts;
  const eligible = candidates
    .filter((p) => {
      try {
        return toMinorUnits(p.amount) > 0 && toMinorUnits(p.amount) <= budget;
      } catch {
        return false;
      }
    })
    .sort(
      (a, b) =>
        Number(occasionMatch(b.category, settings.occasion)) -
          Number(occasionMatch(a.category, settings.occasion)) ||
        Math.abs(toMinorUnits(a.amount) - target) -
          Math.abs(toMinorUnits(b.amount) - target) ||
        a.id.localeCompare(b.id),
    );
  let total = 0;
  const chosen: T[] = [],
    ids = new Set<string>(),
    counts = new Map<string, number>();
  for (const cap of [3, 12])
    for (const p of eligible) {
      if (chosen.length >= settings.maxGifts) break;
      const amount = toMinorUnits(p.amount);
      if (
        ids.has(p.id) ||
        total + amount > budget ||
        (counts.get(p.businessId) || 0) >= cap
      )
        continue;
      chosen.push(p);
      ids.add(p.id);
      counts.set(p.businessId, (counts.get(p.businessId) || 0) + 1);
      total += amount;
    }
  return chosen.map((p) => ({
    ...p,
    reason: occasionMatch(p.category, settings.occasion)
      ? "occasion"
      : "budget",
  }));
}
