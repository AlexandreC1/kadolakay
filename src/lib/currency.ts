/** Display only. Payable totals are calculated in services/money.ts. */
export function formatHTG(amount: number): string {
  return `${amount.toLocaleString("fr-HT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HTG`;
}
export function formatUSD(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
}
