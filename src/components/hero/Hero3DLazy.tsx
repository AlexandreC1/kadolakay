"use client";

import dynamic from "next/dynamic";

const Hero3D = dynamic(() => import("./Hero3D"), {
  loading: () => <div className="gift-display gift-loading" aria-hidden="true"><div className="gift-flat"><span /></div></div>,
});

export default function Hero3DLazy() {
  return <Hero3D />;
}
