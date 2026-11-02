import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { workspaceCopy } from "@/lib/workspace-copy";
import { FoundationForm } from "@/components/shared/FoundationForm";
import { saveBusinessProfile } from "@/actions/workspaces";
export default async function BusinessProfilePage() {
  const locale = await getLocale(),
    c = workspaceCopy(locale),
    t = await getTranslations("business"),
    session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);
  const b = await db.business.findUnique({
    where: { ownerId: session.user.id },
  });
  if (!b) redirect(`/${locale}/business/signup`);
  return (
    <div className="foundation-page foundation-narrow">
      <header className="foundation-intro">
        <h1>{c.businessProfile}</h1>
        <p>{c.reviewHint}</p>
      </header>
      {b.status === "SUSPENDED" ? (
        <p className="foundation-error">{c.suspended}</p>
      ) : (
        <FoundationForm
          action={saveBusinessProfile}
          locale={locale}
          label={c.save}
        >
          {(
            [
              "name",
              "category",
              "patenteNumber",
              "city",
              "department",
              "phone",
              "whatsapp",
              "email",
              "website",
            ] as const
          ).map((field) => (
            <div key={field}>
              <label htmlFor={`profile-${field}`}>{t(field)}</label>
              <input
                id={`profile-${field}`}
                name={field}
                type={
                  field === "email"
                    ? "email"
                    : field === "website"
                      ? "url"
                      : "text"
                }
                required={field === "name" || field === "category"}
                maxLength={
                  field === "patenteNumber"
                    ? 100
                    : field === "website"
                      ? 2048
                      : 200
                }
                defaultValue={b[field] || ""}
              />
            </div>
          ))}
          {(["description", "address", "fulfillmentPolicy"] as const).map(
            (field) => (
              <div key={field}>
                <label htmlFor={`profile-${field}`}>
                  {field === "fulfillmentPolicy"
                    ? c.fulfillmentPolicy
                    : t(field)}
                </label>
                <textarea
                  id={`profile-${field}`}
                  name={field}
                  maxLength={field === "address" ? 500 : 2000}
                  rows={4}
                  defaultValue={b[field] || ""}
                />
              </div>
            ),
          )}
        </FoundationForm>
      )}
    </div>
  );
}
