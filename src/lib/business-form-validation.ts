import { registerBusinessSchema } from "@/lib/validators/business";
export const businessFormFields = ["name", "patenteNumber", "category", "description", "city", "department", "phone", "whatsapp", "moncashNumber", "natcashNumber"] as const;
export type BusinessFormField = typeof businessFormFields[number];
export interface BusinessFormError { field: BusinessFormField | null; code: "nameRequired" | "categoryRequired" | "patenteError" | "fieldInvalid" }
/** Match server validation, collect every invalid field, and never echo raw schema messages. */
export function businessFormErrors(input: unknown): BusinessFormError[] {
  const result = registerBusinessSchema.safeParse(input);
  if (result.success) return [];
  const errors: BusinessFormError[] = [];
  for (const issue of result.error.issues) {
    const field = businessFormFields.find(field => field === issue.path[0]) ?? null;
    if (errors.some(error => error.field === field)) continue;
    errors.push({ field, code: field === "name" ? "nameRequired" : field === "category" ? "categoryRequired" : field === "patenteNumber" ? "patenteError" : "fieldInvalid" });
  }
  return errors;
}
