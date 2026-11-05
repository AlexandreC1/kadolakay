"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath, updateTag } from "next/cache";

export async function updateBusinessStatus(
  businessId: string,
  status: "APPROVED" | "SUSPENDED"
) {
  if (typeof businessId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(businessId) || (status !== "APPROVED" && status !== "SUSPENDED")) throw new Error("Invalid business status");
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

  updateTag("browse");
  revalidatePath("/admin/businesses");
  revalidatePath("/browse");
}
