import type { Metadata } from "next";
import { LegalPage } from "../LegalPage";
import { privacy, pickLocale } from "../content";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return { title: `${privacy[pickLocale(locale)].title} — KadoLakay` };
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  return <LegalPage doc={privacy[pickLocale(locale)]} />;
}
