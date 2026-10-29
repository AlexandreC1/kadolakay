import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { findOwnedRegistryForEdit } from "@/services/registry";
import { RegistryEditForm } from "./RegistryEditForm";
import { RegistryShareButton } from "../RegistryShareButton";
import { previewSharedRegistry } from "@/services/registry-finder";
import { registryShareUrl } from "@/lib/registry-share-url";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditRegistryPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { slug } = await params;
  const registry = await findOwnedRegistryForEdit(session.user.id, slug);
  if (!registry) notFound();

  const t = await getTranslations();
  const locale = await getLocale();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const shareable = registry.status === "PUBLISHED" && (await previewSharedRegistry(slug, baseUrl)).status === "found";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        {t("registry.editRegistry")}
      </h1>
      <p className="text-gray-600 mb-8">{registry.title}</p>
      <div className="mb-8">{shareable ? <RegistryShareButton slug={slug} url={registryShareUrl(slug, locale, baseUrl)} title={registry.title} /> : <p className="text-sm text-[var(--brand-muted)]">{t("share.qrPublishFirst")}</p>}</div>

      <RegistryEditForm registry={registry} />
    </div>
  );
}
