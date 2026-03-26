import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "KadoLakay — Kado pou tout okazyon, lakay ou",
    template: "%s | KadoLakay",
  },
  description:
    "Kreye rejis kado pou fèt bebe, maryaj, ak anivesè. Pataje ak fanmi ak zanmi ou toupatou nan mond lan.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
