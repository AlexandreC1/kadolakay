import { z } from "zod";
import type { Prisma } from "@prisma/client";

export const discoverySchema = z
  .object({
    currency: z.enum(["HTG", "USD"]).default("HTG"),
    budget: z
      .string()
      .trim()
      .regex(/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/)
      .optional(),
    occasion: z
      .enum(["ALL", "BABY_SHOWER", "WEDDING", "BIRTHDAY"])
      .default("ALL"),
    q: z.string().trim().max(64).optional(),
  })
  .strict();
export type Discovery = z.infer<typeof discoverySchema>;
const terms: Record<string, string[]> = {
  BABY_SHOWER: [
    "baby",
    "bébé",
    "bebe",
    "bèso",
    "crib",
    "poussette",
    "poussèt",
    "bibwon",
  ],
  WEDDING: [
    "home",
    "maison",
    "mezon",
    "meuble",
    "furniture",
    "ménage",
    "cuisine",
    "kitchen",
    "maryaj",
    "mariage",
  ],
  BIRTHDAY: [
    "anniversaire",
    "birthday",
    "anivèsè",
    "cadeau",
    "gift",
    "kado",
    "bijou",
    "jewelry",
  ],
};
/** Exact decimal strings go to Postgres, with no exchange-rate guesses or float math. */
export function discoveryWhere(filter: Discovery): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [];
  if (filter.budget !== undefined)
    and.push({
      [filter.currency === "USD" ? "priceUSD" : "priceHTG"]: {
        not: null,
        lte: filter.budget,
      },
    });
  if (filter.q)
    and.push({
      OR: [
        { name: { contains: filter.q, mode: "insensitive" } },
        { business: { name: { contains: filter.q, mode: "insensitive" } } },
      ],
    });
  if (filter.occasion !== "ALL")
    and.push({
      OR: terms[filter.occasion].flatMap((term) => [
        { category: { contains: term, mode: "insensitive" as const } },
        { name: { contains: term, mode: "insensitive" as const } },
      ]),
    });
  return {
    inStock: true,
    deletedAt: null,
    business: {
      status: "APPROVED",
      owner: { bannedAt: null, deletedAt: null },
    },
    AND: and,
  };
}
