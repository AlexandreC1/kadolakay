"use server";

import { requireActor } from "@/services/authorization";
import { db } from "@/lib/db";
import { parseFormFields } from "@/lib/validators/shared";
import { updateProfileSchema } from "@/lib/validators/user";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const actor = await requireActor("profile");

  // Pick only the fields we accept. Anything else in the FormData is ignored,
  // so a crafted request can't reach other User columns.
  parseFormFields(formData, ["name", "phone", "preferredLocale"]);
  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    preferredLocale: formData.get("preferredLocale") || undefined,
  });
  if (!parsed.success) {
    throw new Error("Invalid profile data");
  }

  await db.user.update({
    where: { id: actor.id },
    data: parsed.data,
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
