import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { parseEntityId } from "@/lib/validators/entity-id";
import { addItemSchema, updateItemSchema } from "@/lib/validators/registry";
import { lockActor } from "./locked-actor";
async function lockRegistry(
  tx: Prisma.TransactionClient,
  actorId: string,
  id: string,
) {
  await tx.$queryRaw`SELECT id FROM registries WHERE id=${id} AND "userId"=${actorId} FOR UPDATE`;
  const registry = await tx.registry.findFirst({
    where: { id, userId: actorId, status: { not: "ARCHIVED" } },
    select: { id: true },
  });
  if (!registry) throw new Error("Registry not found");
}
export async function addManualGift(
  actorId: string,
  registryId: string,
  input: unknown,
) {
  actorId = parseEntityId(actorId);
  registryId = parseEntityId(registryId);
  const data = addItemSchema.parse(input);
  if (data.source === "LOCAL_BUSINESS" || data.businessId || data.productId)
    throw new Error("Use the catalog picker");
  if (["EXTERNAL", "AMAZON"].includes(data.source) && !data.externalUrl)
    throw new Error("Add the store link for this gift");
  return db.$transaction(async (tx) => {
    await lockActor(tx, actorId, "item:add");
    await lockRegistry(tx, actorId, registryId);
    if ((await tx.registryItem.count({ where: { registryId } })) >= 500)
      throw new Error("Registry gift limit reached");
    return tx.registryItem.create({ data: { ...data, registryId } });
  });
}
async function editableItem(
  tx: Prisma.TransactionClient,
  actorId: string,
  id: string,
) {
  const initial = await tx.registryItem.findUnique({
    where: { id },
    select: { registryId: true },
  });
  if (!initial) throw new Error("Gift not found");
  await lockRegistry(tx, actorId, initial.registryId);
  await tx.$queryRaw`SELECT id FROM registry_items WHERE id=${id} FOR UPDATE`;
  const item = await tx.registryItem.findUnique({
    where: { id },
    include: {
      registry: { select: { userId: true } },
      _count: { select: { orderItems: true } },
    },
  });
  if (!item || item.registry.userId !== actorId)
    throw new Error("Gift not found");
  if (
    item.reservedQty > 0 ||
    item.fulfilledQty > 0 ||
    item._count.orderItems > 0
  )
    throw new Error("Gifts with checkout or payment history cannot be changed");
  return item;
}
export async function removeOwnedGift(actorId: string, itemId: string) {
  actorId = parseEntityId(actorId);
  itemId = parseEntityId(itemId);
  await db.$transaction(async (tx) => {
    await lockActor(tx, actorId, "item:remove");
    await editableItem(tx, actorId, itemId);
    await tx.registryItem.delete({ where: { id: itemId } });
  });
}
export async function updateOwnedGift(
  actorId: string,
  itemId: string,
  input: unknown,
) {
  actorId = parseEntityId(actorId);
  itemId = parseEntityId(itemId);
  const data = updateItemSchema.parse(input);
  await db.$transaction(async (tx) => {
    await lockActor(tx, actorId, "item:update");
    const item = await editableItem(tx, actorId, itemId);
    if (
      item.source === "LOCAL_BUSINESS" &&
      Object.keys(data).some((key) => key !== "quantity")
    )
      throw new Error("Use the merchant catalog for catalog facts");
    await tx.registryItem.update({ where: { id: itemId }, data });
  });
}
