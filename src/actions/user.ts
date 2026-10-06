"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateProfileSchema } from "@/lib/validators/user";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Pick only the fields we accept. Anything else in the FormData is ignored,
  // so a crafted request can't reach other User columns.
  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    preferredLocale: formData.get("preferredLocale") || undefined,
  });
  if (!parsed.success) {
    throw new Error("Invalid profile data");
  }

  await db.user.update({
    where: { id: session.user.id },
    data: parsed.data,
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
