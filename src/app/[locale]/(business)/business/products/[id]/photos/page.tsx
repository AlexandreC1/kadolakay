import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { workspaceCopy } from "@/lib/workspace-copy";
import { FoundationForm } from "@/components/shared/FoundationForm";
import { savePhotos } from "@/actions/workspaces";
import { Link } from "@/i18n/navigation";
import { entityIdSchema } from "@/lib/validators/entity-id";
export default async function PhotosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const locale = await getLocale(),
    c = workspaceCopy(locale),
    session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);
  const id = entityIdSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const product = await db.product.findFirst({
    where: {
      id: id.data,
      business: { ownerId: session.user.id, status: { not: "SUSPENDED" } },
    },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      media: {
        select: { url: true, alt: true },
        orderBy: { position: "asc" },
        take: 8,
      },
    },
  });
  if (!product) notFound();
  return (
    <div className="foundation-page foundation-narrow">
      <Link href="/business/products">{c.products}</Link>
      <header className="foundation-intro">
        <h1>{c.photos}</h1>
        <p>{product.name}</p>
        <p>{c.photoHint}</p>
      </header>
      <FoundationForm action={savePhotos} locale={locale} label={c.save}>
        <input type="hidden" name="productId" value={product.id} />
        <label htmlFor="photo-urls">{c.photos}</label>
        <textarea
          id="photo-urls"
          name="urls"
          rows={8}
          maxLength={16400}
          defaultValue={
            product.media.length
              ? product.media.map((m) => m.url).join("\n")
              : product.imageUrl || ""
          }
        />
        <label htmlFor="photo-alt">{c.photoAlt}</label>
        <input
          id="photo-alt"
          name="alt"
          maxLength={200}
          defaultValue={product.media[0]?.alt || product.name}
        />
      </FoundationForm>
    </div>
  );
}
