// Default exchange rate (updated periodically)
// In production, fetch from an API like exchangerate.host
const DEFAULT_HTG_TO_USD = 0.0057; // ~175 HTG = 1 USD
const DEFAULT_USD_TO_HTG = 175;

let cachedRate: { rate: number; timestamp: number } | null = null;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export async function getExchangeRate(): Promise<number> {
  if (cachedRate && Date.now() - cachedRate.timestamp < CACHE_DURATION) {
    return cachedRate.rate;
  }

  try {
    const response = await fetch(
      "https://api.exchangerate.host/latest?base=USD&symbols=HTG",
      { next: { revalidate: 3600 } }
    );
    const data = await response.json();
    const rate = data.rates?.HTG || DEFAULT_USD_TO_HTG;
    cachedRate = { rate, timestamp: Date.now() };
    return rate;
  } catch {
    return DEFAULT_USD_TO_HTG;
  }
}

export function formatHTG(amount: number): string {
  return `${amount.toLocaleString("fr-HT")} HTG`;
}

export function formatUSD(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

export async function convertHTGtoUSD(htg: number): Promise<number> {
  const rate = await getExchangeRate();
  return Math.round((htg / rate) * 100) / 100;
}

export async function convertUSDtoHTG(usd: number): Promise<number> {
  const rate = await getExchangeRate();
  return Math.round(usd * rate * 100) / 100;
}
