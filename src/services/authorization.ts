import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
export async function requireActor(action: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Please sign in to continue");
  const actor = await db.user.findUnique({ where: { id: session.user.id }, select: { id: true, role: true } });
  if (!actor) throw new Error("Please sign in again");
  const limit = await checkRateLimit("general", `${actor.id}:${action}`);
  if (!limit.ok) throw new Error("Please wait a minute and try again");
  return actor;
}
