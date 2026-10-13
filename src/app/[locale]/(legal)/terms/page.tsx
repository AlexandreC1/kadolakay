import type { Metadata } from "next";
import { LegalPage } from "../LegalPage";
import { terms, pickLocale } from "../content";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return { title: `${terms[pickLocale(locale)].title} — KadoLakay` };
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  return <LegalPage doc={terms[pickLocale(locale)]} />;
}
