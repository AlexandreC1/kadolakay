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
    preferred === "HTG" && priceHTG
      ? formatHTG(priceHTG)
      : priceUSD
        ? formatUSD(priceUSD)
        : priceHTG
          ? formatHTG(priceHTG)
          : null;

  const secondary =
    preferred === "HTG" && priceUSD
      ? formatUSD(priceUSD)
      : preferred === "USD" && priceHTG
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
