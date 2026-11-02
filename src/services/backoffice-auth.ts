import { cache } from "react";
import { getLocale } from "next-intl/server";
import { redirect, notFound } from "next/navigation";
import { requireActor } from "./authorization";
export const requireBackoffice = cache(async () => {
  try {
    return await requireActor("admin:read");
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const locale = await getLocale();
    if (message === "MFA_REQUIRED") redirect(`/${locale}/security`);
    if (message === "Forbidden") notFound();
    if (message.startsWith("Please sign in")) redirect(`/${locale}/login`);
    throw error;
  }
});
