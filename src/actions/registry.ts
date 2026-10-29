"use server";
import { parseEntityId } from "@/lib/validators/entity-id";
import { auth } from "@/lib/auth";
import { requireActor } from "@/services/authorization";
import { createRegistryForUser, updateOwnedRegistry, publishOwnedRegistry, deleteOwnedRegistry, findPublicRegistry, listOwnedRegistries } from "@/services/registry";
import { createRegistrySchema, updateRegistrySchema } from "@/lib/validators/registry";
import { parseFormFields } from "@/lib/validators/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { registryIssueFields, type RegistryCreateResult } from "@/lib/registry-create-feedback";
const fields = ["type", "title", "description", "eventDate", "locale", "isPublic", "amazonWishlistUrl"];
export async function createRegistryDraft(formData: FormData): Promise<RegistryCreateResult> {
  try {
    const actor = await requireActor("registry:create");
    const raw = parseFormFields(formData, fields);
    const parsed = createRegistrySchema.safeParse({ ...raw, isPublic: raw.isPublic !== "false" });
    if (!parsed.success) return { ok: false, code: "INVALID_DETAILS", fields: registryIssueFields(parsed.error.issues) };
    const registry = await createRegistryForUser(actor.id, parsed.data);
    // Creation has committed. A cache refresh failure must not report a failed save.
    try { revalidatePath("/", "layout"); } catch { console.error("Registry created; cache refresh failed"); }
    return { ok: true, destination: `/${parsed.data.locale}/r/${registry.slug}/edit` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return { ok: false, fields: [], code: message === "Invalid form fields" ? "INVALID_DETAILS" : ["Please sign in to continue", "Please sign in again"].includes(message) ? "AUTH_REQUIRED" : message === "Please wait a minute and try again" ? "RATE_LIMITED" : "SAVE_FAILED" };
  }
}
// Preserve the redirect contract for forms already open before this fix.
export async function createRegistry(formData: FormData) {
  const result = await createRegistryDraft(formData);
  if (!result.ok) throw new Error("Could not create the registry. Please review your details or sign in again.");
  redirect(result.destination);
}
export async function updateRegistry(registryId: string, formData: FormData) {
  registryId = parseEntityId(registryId);
  const actor = await requireActor("registry:update");
  const raw = parseFormFields(formData, fields);
  const parsed = updateRegistrySchema.safeParse({ ...raw, ...(raw.isPublic === undefined ? {} : { isPublic: raw.isPublic !== "false" }) });
  if (!parsed.success) throw new Error("Check the registry details and try again");
  await updateOwnedRegistry(actor.id, registryId, parsed.data);
  revalidatePath("/", "layout");
}
export async function publishRegistry(registryId: string) {
  registryId = parseEntityId(registryId);
  const actor = await requireActor("registry:publish");
  await publishOwnedRegistry(actor.id, registryId);
  revalidatePath("/", "layout");
}
export async function deleteRegistry(registryId: string) {
  registryId = parseEntityId(registryId);
  const actor = await requireActor("registry:archive");
  await deleteOwnedRegistry(actor.id, registryId);
  revalidatePath("/", "layout");
  redirect("/my-registries");
}
export async function getMyRegistries() {
  const session = await auth();
  if (!session?.user?.id) return [];
  return listOwnedRegistries(session.user.id);
}
export async function getRegistryBySlug(slug: string) { return findPublicRegistry(slug); }
