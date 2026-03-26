"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateBusinessStatus(
  businessId: string,
  status: "APPROVED" | "SUSPENDED"
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  await db.business.update({
    where: { id: businessId },
    data: { status },
  });

  revalidatePath("/admin/businesses");
  revalidatePath("/browse");
}
