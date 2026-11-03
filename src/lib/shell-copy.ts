/** Labels for the app's primary navigation (top bar on wide screens, tab bar on phones). */
const content = {
  en: { home: "Home", lists: "Lists", gifts: "Gifts", shops: "Shops", account: "Account", newList: "New list", primary: "Primary" },
  fr: { home: "Accueil", lists: "Listes", gifts: "Cadeaux", shops: "Commerces", account: "Compte", newList: "Nouvelle liste", primary: "Navigation principale" },
  ht: { home: "Akèy", lists: "Lis", gifts: "Kado", shops: "Boutik", account: "Kont", newList: "Nouvo lis", primary: "Navigasyon prensipal" },
};
export function shellCopy(locale: string) { return content[locale as keyof typeof content] || content.en; }

/** Which tab a path belongs to, so the right one reads as current. */
export function activeTab(path: string): "home" | "lists" | "gifts" | "shops" | "account" | null {
  if (path === "/" || path === "") return "home";
  if (/^\/(find|registries|r\/)/.test(path)) return "lists";
  if (/^\/(discover|gifts\/)/.test(path)) return "gifts";
  if (/^\/(browse|businesses\/)/.test(path)) return "shops";
  if (/^\/(dashboard|login|register|settings|orders|purchases|baskets)/.test(path)) return "account";
  return null;
}
