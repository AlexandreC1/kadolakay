"use server";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";
import {
  selectionSchema,
  SelectionError,
  saveRegistrySelection,
} from "@/services/registry-selection";

export async function addSelectedGifts(input: unknown) {
  const session = await auth();
  if (!session?.user?.id)
    return { ok: false as const, error: "forbidden" as const };
  const parsed = selectionSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" as const };
  if (!(await checkRateLimit("registryMutation", session.user.id)).ok)
    return { ok: false as const, error: "rate" as const };
  try {
    const result = await saveRegistrySelection(session.user.id, parsed.data);
    for (const locale of ["en", "fr", "ht"]) {
      revalidatePath(`/${locale}/r/${result.slug}`);
      revalidatePath(`/${locale}/r/${result.slug}/edit`);
    }
    return {
      ok: true as const,
      added: result.added,
      existing: result.existing,
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof SelectionError ? error.code : ("failed" as const),
    };
  }
}
