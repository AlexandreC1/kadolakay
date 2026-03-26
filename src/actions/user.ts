"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const name = formData.get("name") as string;
  const phone = (formData.get("phone") as string) || null;
  const preferredLocale = (formData.get("preferredLocale") as string) || "ht";

  // Validate locale
  if (!["ht", "fr", "en"].includes(preferredLocale)) {
    throw new Error("Invalid locale");
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      name: name || null,
      phone,
      preferredLocale,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
