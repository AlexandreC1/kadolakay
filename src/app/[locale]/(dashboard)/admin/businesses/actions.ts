"use server";

import { db } from "@/lib/db";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { requireActor } from "@/services/authorization";
import { revalidatePath } from "next/cache";

export async function updateBusinessStatus(
  businessId: string,
  status: "APPROVED" | "SUSPENDED"
) {
  const actor = await requireActor("admin:business");
  if (actor.role !== "ADMIN") throw new Error("Forbidden");
  const parsed = z.strictObject({ id: z.string().min(1).max(100), status: z.enum(["APPROVED", "SUSPENDED"]) }).safeParse({ id: businessId, status });
  if (!parsed.success) throw new Error("Invalid business update");

  await db.business.update({
    where: { id: businessId },
    data: { status },
  });

  revalidateTag("public-catalog", { expire: 0 });
  revalidatePath("/", "layout");
  revalidatePath("/browse");
}
