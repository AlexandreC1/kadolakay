import { db } from "@/lib/db";
import { createWithUniqueSlug } from "@/lib/slug";
import { parseEntityId } from "@/lib/validators/entity-id";
import { addProductSchema, editProductSchema, registerBusinessSchema, type AddProductInput, type EditProductInput, type RegisterBusinessInput } from "@/lib/validators/business";

export async function registerOwnedBusiness(actorId: string, input: RegisterBusinessInput) {
  actorId = parseEntityId(actorId);
  const data = registerBusinessSchema.parse(input);
  return createWithUniqueSlug(data.name, "business", slug => db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${actorId} FOR UPDATE`;
    const actor = await tx.user.findUnique({ where: { id: actorId }, select: { role: true } });
    if (!actor) throw new Error("Please sign in again");
    if (await tx.business.findUnique({ where: { ownerId: actorId }, select: { id: true } })) throw new Error("A business is already registered to this account");
    const business = await tx.business.create({ data: { ...data, slug, ownerId: actorId } });
    if (actor.role !== "ADMIN") await tx.user.update({ where: { id: actorId }, data: { role: "BUSINESS_OWNER" } });
    return business.id;
  }));
}

export async function addOwnedProduct(actorId: string, input: AddProductInput) {
  actorId = parseEntityId(actorId);
  const data = addProductSchema.parse(input);
  return db.$transaction(async tx => {
    // Share the approval row lock with suspension writes until the product is saved.
    await tx.$queryRaw`SELECT id FROM businesses WHERE "ownerId" = ${actorId} FOR UPDATE`;
    const business = await tx.business.findFirst({ where: { ownerId: actorId, status: { not: "SUSPENDED" } }, select: { id: true } });
    if (!business) throw new Error("Your business cannot change products right now");
    return tx.product.create({ data: { ...data, businessId: business.id }, select: { id: true } });
  });
}

export async function editOwnedProduct(actorId: string, productId: string, input: EditProductInput) {
  actorId = parseEntityId(actorId);
  productId = parseEntityId(productId);
  const data = editProductSchema.parse(input);
  await db.$transaction(async tx => {
  await tx.$queryRaw`SELECT id FROM products WHERE id = ${productId} FOR UPDATE`;
  if (await tx.orderItem.count({ where: { registryItem: { productId }, order: { status: "PENDING" } } })) throw new Error("This product has an active checkout. Try again after it completes.");
  const result = await tx.product.updateMany({
    where: { id: productId, business: { ownerId: actorId, status: { not: "SUSPENDED" } } },
    data: { ...data, priceHTG: data.priceHTG ?? null, priceUSD: data.priceUSD ?? null, imageUrl: data.imageUrl || null },
  });
  if (!result.count) throw new Error("This product is unavailable or cannot be changed");
  });
}
