"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateUniqueSlug } from "@/lib/slug";
import { Prisma } from "@prisma/client";
import { registerBusinessSchema, addProductSchema, updateProductSchema } from "@/lib/validators/business";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function registerBusiness(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Check if user already has a business
  const existing = await db.business.findUnique({
    where: { ownerId: session.user.id },
  });

  if (existing) {
    throw new Error("You already have a registered business");
  }

  const raw = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    category: formData.get("category") as string,
    city: (formData.get("city") as string) || undefined,
    department: (formData.get("department") as string) || undefined,
    address: (formData.get("address") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    whatsapp: (formData.get("whatsapp") as string) || undefined,
    email: (formData.get("email") as string) || undefined,
    website: (formData.get("website") as string) || undefined,
    moncashNumber: (formData.get("moncashNumber") as string) || undefined,
    natcashNumber: (formData.get("natcashNumber") as string) || undefined,
  };

  const parsed = registerBusinessSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Invalid business data");
  const data = parsed.data;
  const slug = await generateUniqueSlug(data.name, "business");
  const userId = session.user.id;

  // Business + role change are one unit (review M7). A concurrent double
  // submit hits the unique ownerId and gets a friendly error, not a 500.
  try {
    await db.$transaction(async (tx) => {
      await tx.business.create({ data: { ...data, email: data.email || undefined, slug, ownerId: userId } });
      // Never downgrade an ADMIN who registers a business.
      await tx.user.updateMany({ where: { id: userId, role: "USER" }, data: { role: "BUSINESS_OWNER" } });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error("You already have a registered business");
    }
    throw err;
  }

  revalidatePath("/business/dashboard");
  redirect("/business/dashboard");
}

export async function addProduct(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const business = await db.business.findUnique({
    where: { ownerId: session.user.id },
  });

  if (!business) {
    throw new Error("No business found");
  }
  if (business.status !== "APPROVED") {
    throw new Error("Your business must be approved before adding products");
  }

  const raw = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    priceHTG: formData.get("priceHTG") ? Number(formData.get("priceHTG")) : undefined,
    priceUSD: formData.get("priceUSD") ? Number(formData.get("priceUSD")) : undefined,
    category: (formData.get("category") as string) || undefined,
    imageUrl: (formData.get("imageUrl") as string) || undefined,
  };

  const parsed = addProductSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Invalid product data");
  const data = parsed.data;

  await db.product.create({
    data: {
      ...data,
      businessId: business.id,
    },
  });

  revalidatePath("/business/products");
}

async function ownedProduct(productId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (typeof productId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(productId)) throw new Error("Not found");
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { id: true, deletedAt: true, business: { select: { ownerId: true } } },
  });
  if (!product || product.deletedAt || product.business.ownerId !== session.user.id) throw new Error("Not found");
  return product;
}

export async function updateProduct(productId: string, formData: FormData) {
  await ownedProduct(productId);
  const FIELDS = ["name", "description", "priceHTG", "priceUSD", "category", "imageUrl"] as const;
  const raw: Record<string, unknown> = {};
  for (const key of FIELDS) {
    const value = formData.get(key);
    if (typeof value === "string" && value !== "") raw[key] = value;
  }
  const inStock = formData.get("inStock");
  if (inStock === "true" || inStock === "false") raw.inStock = inStock === "true";
  const parsed = updateProductSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Invalid product data");
  await db.product.update({ where: { id: productId }, data: parsed.data });
  revalidatePath("/business/products");
}

/** Soft delete: existing registry items keep their snapshot of the product. */
export async function deleteProduct(productId: string) {
  await ownedProduct(productId);
  await db.product.update({ where: { id: productId }, data: { deletedAt: new Date(), inStock: false } });
  revalidatePath("/business/products");
}

export async function getApprovedBusinesses() {
  return db.business.findMany({
    where: { status: "APPROVED" },
    include: {
      products: {
        where: { inStock: true, deletedAt: null },
        take: 4,
      },
    },
    orderBy: { name: "asc" },
  });
}
