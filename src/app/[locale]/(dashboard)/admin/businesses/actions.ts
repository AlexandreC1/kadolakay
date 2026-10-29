"use server";

import { reviewBusiness } from "@/services/business-review";
import { revalidateTag } from "next/cache";
import { requireActor } from "@/services/authorization";
import { revalidatePath } from "next/cache";

export async function updateBusinessStatus(
  businessId: string,
  status: "APPROVED" | "SUSPENDED"
) {
  const actor = await requireActor("admin:business");
  await reviewBusiness(actor.id, { businessId, status });

  revalidateTag("public-catalog", { expire: 0 });
  revalidatePath("/", "layout");
  revalidatePath("/browse");
}
