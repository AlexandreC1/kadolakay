import { z } from "zod";
// URL fields may be rendered as links or images. Never permit executable schemes.
export const webUrl = z.string().trim().max(2048).url().refine((value) => {
  // Zod can run refinements after a preceding URL check fails. Never throw here:
  // optional empty strings must be able to reach the union's empty-value branch.
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}, "Use an http or https URL without embedded credentials");
export const optionalWebUrl = webUrl.or(z.string().trim().length(0)).optional();
export const moneyPrice = z.number().finite().positive().max(9999999.99).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001, "Use no more than two decimal places");
export function parseFormFields(form: FormData, allowed: readonly string[]) {
  const result: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (key.startsWith("$ACTION_")) continue;
    if (!allowed.includes(key) || typeof value !== "string" || key in result) throw new Error("Invalid form fields");
    result[key] = value;
  }
  return result;
}
