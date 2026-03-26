import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { RegistryEditForm } from "./RegistryEditForm";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditRegistryPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { slug } = await params;
  const registry = await db.registry.findUnique({
    where: { slug },
    include: {
      items: {
        orderBy: { priority: "asc" },
      },
    },
  });

  if (!registry || registry.userId !== session.user.id) {
    notFound();
  }

  const t = await getTranslations();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        {t("registry.editRegistry")}
      </h1>
      <p className="text-gray-600 mb-8">{registry.title}</p>

      <RegistryEditForm registry={registry} />
    </div>
  );
}
