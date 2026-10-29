export const occasionTypes = ["BIRTHDAY", "BABY_SHOWER", "WEDDING", "CHRISTMAS", "SHOPPING", "OTHER"] as const;
export type Occasion = typeof occasionTypes[number];
export const occasionLabels = {
  en: { BIRTHDAY: "Birthday", BABY_SHOWER: "Baby shower", WEDDING: "Wedding", CHRISTMAS: "Christmas", SHOPPING: "Shopping", OTHER: "Another occasion" },
  fr: { BIRTHDAY: "Anniversaire", BABY_SHOWER: "Naissance", WEDDING: "Mariage", CHRISTMAS: "Noël", SHOPPING: "Envies du quotidien", OTHER: "Une autre occasion" },
  ht: { BIRTHDAY: "Anivèsè", BABY_SHOWER: "Fèt pou tibebe", WEDDING: "Maryaj", CHRISTMAS: "Nwèl", SHOPPING: "Sa m ta renmen", OTHER: "Yon lòt okazyon" },
};
export function occasionLabel(type: string, locale: string) {
  const labels = occasionLabels[locale as keyof typeof occasionLabels] || occasionLabels.en;
  return labels[type as Occasion] || labels.OTHER;
}
export function isOccasion(value: unknown): value is Occasion {
  return typeof value === "string" && (occasionTypes as readonly string[]).includes(value);
}
