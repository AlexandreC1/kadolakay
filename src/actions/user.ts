"use server";

import { requireActor } from "@/services/authorization";
import { db } from "@/lib/db";
import { parseFormFields } from "@/lib/validators/shared";
import { updateProfileSchema } from "@/lib/validators/user";
import { revalidatePath } from "next/cache";
import { signOut } from "@/lib/auth";
import { getLocale } from "next-intl/server";
import { revokeOwnSessions } from "@/services/sessions";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  deleteAccount,
  AccountDeletionBlocked,
  type AccountDeletionBlock,
} from "@/services/account-data";

export async function signOutEverywhere(formData: FormData) {
  parseFormFields(formData, []);
  const actor = await requireActor("session:revoke");
  const locale = await getLocale();
  await revokeOwnSessions(actor.id);
  await signOut({ redirectTo: `/${locale}/login` });
}

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

export type AccountDeletionState = {
  status: "idle" | "invalid" | "mismatch" | "blocked" | "unavailable";
  reason?: AccountDeletionBlock;
};

/** Deletes the signed-in person's account after they retype their email address. */
export async function deleteMyAccount(
  _previous: AccountDeletionState,
  formData: FormData,
): Promise<AccountDeletionState> {
  let locale: string;
  try {
    const { confirmation } = parseFormFields(formData, ["confirmation"]);
    if (typeof confirmation !== "string" || !confirmation.trim()) return { status: "invalid" };
    const actor = await requireActor("account:delete");
    if (!(await checkRateLimit("auth", `account-delete:${actor.id}`)).ok) return { status: "unavailable" };
    locale = await getLocale();
    await deleteAccount(actor.id, confirmation);
  } catch (error) {
    if (error instanceof AccountDeletionBlocked) return { status: "blocked", reason: error.reason };
    if (error instanceof Error && error.message === "CONFIRMATION_MISMATCH") return { status: "mismatch" };
    return { status: "unavailable" };
  }
  await signOut({ redirectTo: `/${locale}?account=deleted` });
  return { status: "idle" };
}
