"use client";

import { formatHTG, formatUSD } from "@/lib/currency";

interface CurrencyDisplayProps {
  priceHTG?: number | null;
  priceUSD?: number | null;
  preferred?: "HTG" | "USD";
  className?: string;
}

export function CurrencyDisplay({
  priceHTG,
  priceUSD,
  preferred = "USD",
  className = "",
}: CurrencyDisplayProps) {
  const primary =
    preferred === "HTG" && priceHTG != null
      ? formatHTG(priceHTG)
      : priceUSD != null
        ? formatUSD(priceUSD)
        : priceHTG != null
          ? formatHTG(priceHTG)
          : null;

  const secondary =
    preferred === "HTG" && priceUSD != null
      ? formatUSD(priceUSD)
      : preferred === "USD" && priceHTG != null
        ? formatHTG(priceHTG)
        : null;

  if (!primary) return null;

  return (
    <span className={className}>
      <span className="font-semibold">{primary}</span>
      {secondary && (
        <span className="text-xs text-gray-400 ml-1">({secondary})</span>
      )}
    </span>
  );
}
