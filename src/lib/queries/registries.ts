/**
 * "My registries" list (WS7, review L7): counts via _count / groupBy instead
 * of loading every item of every registry.
 */
import { db } from "@/lib/db";
import { cursorArgs, toPage, type PageRequest } from "@/lib/pagination";

export async function getMyRegistriesPage(userId: string, page: PageRequest) {
  const rows = await db.registry.findMany({
    where: { userId },
    select: {
      id: true,
      slug: true,
      title: true,
      type: true,
      status: true,
      eventDate: true,
      isPublic: true,
      _count: { select: { items: true } },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    ...cursorArgs(page),
  });
  const result = toPage(rows, page.take);
  const ids = result.items.map((r) => r.id);
  const fulfilled = ids.length
    ? await db.registryItem.groupBy({
        by: ["registryId"],
        where: { registryId: { in: ids }, status: "FULFILLED" },
        _count: { _all: true },
      })
    : [];
  const byId = new Map(fulfilled.map((f) => [f.registryId, f._count._all]));
  return {
    nextCursor: result.nextCursor,
    items: result.items.map(({ _count, ...r }) => ({ ...r, totalItems: _count.items, fulfilledItems: byId.get(r.id) ?? 0 })),
  };
}
