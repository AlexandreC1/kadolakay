import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "KDOM · Kado pou tout okazyon, lakay ou",
    template: "%s | KDOM",
  },
  icons:{icon:{url:"/icon.svg",type:"image/svg+xml"}},
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
