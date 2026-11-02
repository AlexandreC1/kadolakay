import { z } from "zod";
import { db } from "@/lib/db";
import { createWithUniqueSlug } from "@/lib/slug";
import {
  entityIdSchema,
  entitySlugSchema,
  parseEntityId,
} from "@/lib/validators/entity-id";
import {
  hashRegistryPassword,
  checkRegistryPassword,
} from "@/lib/security-crypto";
import { createRegistryGrant } from "@/lib/registry-access";
import { lockActor } from "./locked-actor";
import { auditOperation } from "./operation-audit";

export const basketSchema = z.strictObject({
  title: z.string().trim().min(2).max(100),
  recipientName: z.string().trim().min(1).max(100),
  recipientMessage: z.string().trim().max(1000).default(""),
  kind: z.enum(["BASKET_PERSONAL", "BASKET_SHARED"]),
  type: z.enum([
    "BIRTHDAY",
    "WEDDING",
    "BABY_SHOWER",
    "CHRISTMAS",
    "SHOPPING",
    "OTHER",
  ]),
  locale: z.enum(["ht", "fr", "en"]),
});
export async function createBasket(actorId: string, input: unknown) {
  actorId = parseEntityId(actorId);
  const data = basketSchema.parse(input);
  return createWithUniqueSlug(data.title, "registry", (slug) =>
    db.$transaction(async (tx) => {
      await lockActor(tx, actorId, "basket:manage");
      return tx.registry.create({
        data: {
          ...data,
          userId: actorId,
          slug,
          isPublic: false,
          visibility: "PRIVATE",
          searchable: false,
        },
        select: { id: true, slug: true },
      });
    }),
  );
}
export async function updateBasket(
  actorId: string,
  id: string,
  input: unknown,
) {
  actorId = parseEntityId(actorId);
  id = parseEntityId(id);
  const data = basketSchema.omit({ locale: true }).parse(input);
  return db.$transaction(async (tx) => {
    await lockActor(tx, actorId, "basket:manage");
    await tx.$queryRaw`SELECT id FROM registries WHERE id=${id} AND "userId"=${actorId} FOR UPDATE`;
    const basket = await tx.registry.findFirst({
      where: {
        id,
        userId: actorId,
        kind: { in: ["BASKET_PERSONAL", "BASKET_SHARED"] },
        status: { not: "ARCHIVED" },
      },
      select: { kind: true },
    });
    if (!basket) throw new Error("BASKET_UNAVAILABLE");
    if (
      basket.kind !== data.kind &&
      (await tx.orderItem.count({
        where: { registryItem: { registryId: id } },
      }))
    )
      throw new Error("BASKET_MODE_LOCKED");
    await tx.registry.update({
      where: { id },
      data: {
        ...data,
        ...(data.kind === "BASKET_PERSONAL" ? { searchable: false } : {}),
      },
    });
  });
}
export const privacySchema = z
  .strictObject({
    registryId: entityIdSchema,
    visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE", "PROTECTED"]),
    searchable: z.boolean(),
    password: z.string().max(128).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.searchable && v.visibility !== "PUBLIC")
      ctx.addIssue({
        code: "custom",
        message: "Search requires public visibility",
      });
    if (v.password && v.password.length < 10)
      ctx.addIssue({ code: "custom", message: "Use at least 10 characters" });
  });
export async function saveRegistryPrivacy(actorId: string, input: unknown) {
  actorId = parseEntityId(actorId);
  const data = privacySchema.parse(input);
  const hash = data.password ? await hashRegistryPassword(data.password) : null;
  await db.$transaction(async (tx) => {
    await lockActor(tx, actorId, "registry:privacy");
    await tx.$queryRaw`SELECT id FROM registries WHERE id=${data.registryId} AND "userId"=${actorId} FOR UPDATE`;
    const registry = await tx.registry.findFirst({
      where: {
        id: data.registryId,
        userId: actorId,
        status: { not: "ARCHIVED" },
      },
      select: { password: true, visibility: true, kind: true },
    });
    if (!registry) throw new Error("REGISTRY_UNAVAILABLE");
    if (data.searchable && registry.kind === "BASKET_PERSONAL")
      throw new Error("PERSONAL_BASKET_NOT_SEARCHABLE");
    const password =
      data.visibility === "PROTECTED" ? hash || registry.password : null;
    if (data.visibility === "PROTECTED" && !password?.startsWith("scrypt1:"))
      throw new Error("PASSWORD_REQUIRED");
    await tx.registry.update({
      where: { id: data.registryId },
      data: {
        visibility: data.visibility,
        isPublic: data.visibility !== "PRIVATE",
        searchable: data.searchable,
        password,
      },
    });
    await auditOperation(
      tx,
      actorId,
      "REGISTRY_PRIVACY_CHANGED",
      "REGISTRY",
      data.registryId,
      registry.visibility,
      data.visibility,
    );
  });
}
export async function unlockRegistry(slug: string, password: string) {
  slug = entitySlugSchema.parse(slug);
  const registry = await db.registry.findFirst({
    where: {
      slug,
      status: "PUBLISHED",
      visibility: "PROTECTED",
      isPublic: true,
      user: { suspendedAt: null },
    },
    select: { id: true, password: true },
  });
  // Same expensive comparison on misses to avoid a cheap password/slug oracle.
  const placeholder =
    "scrypt1:00000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000";
  const valid = await checkRegistryPassword(
    password,
    registry?.password || placeholder,
  );
  if (!registry?.password || !valid) throw new Error("REGISTRY_ACCESS_INVALID");
  return createRegistryGrant(registry.id, registry.password);
}
export const registrySearchSchema = z.strictObject({
  q: z.string().trim().max(80).default(""),
  type: z
    .enum([
      "",
      "BIRTHDAY",
      "WEDDING",
      "BABY_SHOWER",
      "CHRISTMAS",
      "SHOPPING",
      "OTHER",
    ])
    .default(""),
  after: z.string().max(1000).optional(),
});
export async function searchPublicRegistries(input: unknown) {
  const data = registrySearchSchema.parse(input);
  const cursor = data.after
    ? z
        .strictObject({ title: z.string().max(100), id: entityIdSchema })
        .parse(
          JSON.parse(Buffer.from(data.after, "base64url").toString("utf8")),
        )
    : null;
  const rows = await db.registry.findMany({
    where: {
      status: "PUBLISHED",
      visibility: "PUBLIC",
      isPublic: true,
      searchable: true,
      password: null,
      user: { suspendedAt: null },
      kind: { not: "BASKET_PERSONAL" },
      ...(data.type ? { type: data.type } : {}),
      AND: [
        ...(data.q
          ? [
              {
                OR: [
                  { title: { contains: data.q, mode: "insensitive" as const } },
                  {
                    user: {
                      name: { contains: data.q, mode: "insensitive" as const },
                    },
                  },
                ],
              },
            ]
          : []),
        ...(cursor
          ? [
              {
                OR: [
                  { title: { gt: cursor.title } },
                  { title: cursor.title, id: { gt: cursor.id } },
                ],
              },
            ]
          : []),
      ],
    },
    select: {
      id: true,
      title: true,
      slug: true,
      type: true,
      eventDate: true,
      user: { select: { name: true } },
    },
    orderBy: [{ title: "asc" }, { id: "asc" }],
    take: 13,
  });
  const items = rows.slice(0, 12),
    last = items.at(-1);
  return {
    items,
    next:
      rows.length > 12 && last
        ? Buffer.from(
            JSON.stringify({ title: last.title, id: last.id }),
          ).toString("base64url")
        : null,
  };
}
