/**
 * Cursor pagination helpers (implements contracts/pagination.ts). Always
 * pair cursorArgs() with a total, unique order (createdAt/name + id) so pages
 * never skip or repeat rows.
 */
export {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  cursorArgs,
  parsePageRequest,
  toPage,
  type Page,
  type PageRequest,
} from "@/lib/contracts/pagination";

/** Build `?cursor=` links that keep other query params (tab, q, …). */
export function pageHref(
  pathname: string,
  params: Record<string, string | undefined | null>,
  cursor: string | null,
): string | null {
  if (!cursor) return null;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v && k !== "cursor") sp.set(k, v);
  sp.set("cursor", cursor);
  return `${pathname}?${sp.toString()}`;
}

/** Normalise a free-text search term: trimmed, max 64 chars, or undefined. */
export function parseSearch(q: string | null | undefined): string | undefined {
  const s = (q ?? "").trim().slice(0, 64);
  return s.length >= 1 ? s : undefined;
}
