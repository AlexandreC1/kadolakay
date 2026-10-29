"use server";
import { requireActor } from "@/services/authorization";
import { addProductSchema, editProductSchema, registerBusinessSchema } from "@/lib/validators/business";
import { parseFormFields } from "@/lib/validators/shared";
import { addOwnedProduct, editOwnedProduct, registerOwnedBusiness } from "@/services/business";
import { listApprovedBusinesses } from "@/services/catalog";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

function refreshCatalog() {
  revalidateTag("public-catalog", { expire: 0 });
  revalidatePath("/", "layout");
}
export async function registerBusiness(formData: FormData) {
  const actor = await requireActor("business:register");
  const raw = parseFormFields(formData, ["name", "description", "category", "patenteNumber", "city", "department", "address", "phone", "whatsapp", "email", "website", "moncashNumber", "natcashNumber"]);
  const parsed = registerBusinessSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Check your business details and try again");
  await registerOwnedBusiness(actor.id, parsed.data);
  revalidatePath("/", "layout");
  redirect("/business/dashboard");
}
function productValues(formData: FormData, edit = false) {
  const raw = parseFormFields(formData, ["name", "description", "priceHTG", "priceUSD", "category", "imageUrl", ...(edit ? ["inStock"] : [])]);
  if (edit && raw.inStock !== "true" && raw.inStock !== "false") throw new Error("Choose product availability");
  return { ...raw, priceHTG: raw.priceHTG ? Number(raw.priceHTG) : undefined, priceUSD: raw.priceUSD ? Number(raw.priceUSD) : undefined, ...(edit ? { inStock: raw.inStock === "true" } : {}) };
}
export async function addProduct(formData: FormData) {
  const actor = await requireActor("product:add");
  const parsed = addProductSchema.safeParse(productValues(formData));
  if (!parsed.success) throw new Error("Check the product details and add a price");
  await addOwnedProduct(actor.id, parsed.data);
  refreshCatalog();
}
export async function editProduct(productId: string, formData: FormData) {
  const actor = await requireActor("product:edit");
  const parsed = editProductSchema.safeParse(productValues(formData, true));
  if (!parsed.success) throw new Error("Check the product details and add a price");
  await editOwnedProduct(actor.id, productId, parsed.data);
  refreshCatalog();
}
export async function getApprovedBusinesses() { return listApprovedBusinesses(); }
