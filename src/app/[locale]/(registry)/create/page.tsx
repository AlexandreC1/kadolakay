import { isOccasion } from "@/lib/occasions";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CreateRegistryForm } from "./CreateRegistryForm";

export default async function CreateRegistryPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ type?: string }> }) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const initialType = isOccasion(query.type) ? query.type : undefined;
  const session = await auth();
  if (!session?.user) {
    const target = `/${locale}/create${initialType ? `?type=${initialType}` : ""}`;
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(target)}`);
  }

  return (
    <div className="create-wishlist-shell">
        <CreateRegistryForm initialType={initialType} />
    </div>
  );
}
