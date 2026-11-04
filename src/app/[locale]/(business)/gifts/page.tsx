import { redirect } from "next/navigation";

/** /gifts was the gift finder on another branch; the finder lives at /discover. */
export default async function GiftsIndex({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale }, raw] = await Promise.all([params, searchParams]);
  const query = new URLSearchParams();
  for (const key of ["q", "currency", "budget"] as const) {
    const value = raw[key];
    if (typeof value === "string" && value.length <= 80) query.set(key, value);
  }
  const qs = query.toString();
  redirect(`${locale === "ht" ? "" : `/${locale}`}/discover${qs ? `?${qs}` : ""}`);
}
