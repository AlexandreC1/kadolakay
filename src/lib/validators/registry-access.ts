import { timingSafeEqual } from "node:crypto";

/** Pure visibility rule for a registry (review M3). */
export function canViewRegistry(
  registry: { status: string; isPublic: boolean; shareToken: string },
  viewer: { isOwner: boolean; shareToken?: string | null }
): boolean {
  if (viewer.isOwner) return true;
  if (registry.status !== "PUBLISHED") return false;
  if (registry.isPublic) return true;
  return !!viewer.shareToken && safeEqual(viewer.shareToken, registry.shareToken);
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
