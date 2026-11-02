import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { canPerform, type Permission } from "./permissions";
import { requireAdminStepUp } from "./device-sessions";
import { recordOperationalEvent } from "@/lib/operational-events";
export async function requireActor(action: Permission) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Please sign in to continue");
  const actor = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, suspendedAt: true },
  });
  if (!actor || actor.suspendedAt) throw new Error("Please sign in again");
  if (!canPerform(actor.role, action)) {
    recordOperationalEvent("authorization_denied", { outcome: "denied" });
    throw new Error("Forbidden");
  }
  const limit = await checkRateLimit("general", `${actor.id}:${action}`);
  if (!limit.ok) throw new Error("Please wait a minute and try again");
  if (action.startsWith("admin:") || action === "premium:grant")
    await requireAdminStepUp(actor.id, session.user.deviceSessionId);
  return { ...actor, deviceId: session.user.deviceSessionId };
}
