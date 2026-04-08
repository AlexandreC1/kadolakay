"use client";

/**
 * Client-only wrapper around Hero3D. We need this layer because Server
 * Components in Next.js 16 can't use `next/dynamic({ ssr: false })` directly,
 * and we want the framer-motion bundle (and the parallax math) to load
 * lazily on the client only.
 */
import dynamic from "next/dynamic";

const Hero3D = dynamic(() => import("./Hero3D"), {
  ssr: false,
  loading: () => (
    <div className="aspect-square w-full max-w-md sm:max-w-lg lg:max-w-xl mx-auto" />
  ),
});

export default function Hero3DLazy() {
  return <Hero3D />;
}
