/**
 * Cursor pagination contract (plan §4.5). Implemented against Prisma as:
 *   const rows = await db.x.findMany({ ...cursorArgs(page), orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
 *   return toPage(rows, page.take);
 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

export interface PageRequest {
  cursor?: string;
  take: number;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/** Parse untrusted `?cursor=&take=` values into a safe PageRequest. */
export function parsePageRequest(input: {
  cursor?: string | null;
  take?: string | number | null;
}): PageRequest {
  const n = Number(input.take);
  const take = Number.isInteger(n) && n > 0 ? Math.min(n, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
  const cursor =
    typeof input.cursor === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(input.cursor)
      ? input.cursor
      : undefined;
  return { cursor, take };
}

/** Prisma findMany args: fetch one extra row to know whether a next page exists. */
export function cursorArgs(page: PageRequest) {
  return {
    take: page.take + 1,
    ...(page.cursor ? { cursor: { id: page.cursor }, skip: 1 } : {}),
  };
}

export function toPage<T extends { id: string }>(rows: T[], take: number): Page<T> {
  const hasMore = rows.length > take;
  const items = hasMore ? rows.slice(0, take) : rows;
  return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
}
