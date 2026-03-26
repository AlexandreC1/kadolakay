"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateUniqueSlug } from "@/lib/slug";
import { registerBusinessSchema, addProductSchema } from "@/lib/validators/business";
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

  const data = registerBusinessSchema.parse(raw);
  const slug = await generateUniqueSlug(data.name, "business");

  await db.business.create({
    data: {
      ...data,
      slug,
      ownerId: session.user.id,
    },
  });

  // Update user role
  await db.user.update({
    where: { id: session.user.id },
    data: { role: "BUSINESS_OWNER" },
  });

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

  const raw = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    priceHTG: formData.get("priceHTG") ? Number(formData.get("priceHTG")) : undefined,
    priceUSD: formData.get("priceUSD") ? Number(formData.get("priceUSD")) : undefined,
    category: (formData.get("category") as string) || undefined,
    imageUrl: (formData.get("imageUrl") as string) || undefined,
  };

  const data = addProductSchema.parse(raw);

  await db.product.create({
    data: {
      ...data,
      businessId: business.id,
    },
  });

  revalidatePath("/business/products");
}

export async function getApprovedBusinesses() {
  return db.business.findMany({
    where: { status: "APPROVED" },
    include: {
      products: {
        where: { inStock: true },
        take: 4,
      },
    },
    orderBy: { name: "asc" },
  });
}
