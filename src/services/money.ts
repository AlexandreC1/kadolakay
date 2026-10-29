/** Convert a database decimal without floating-point multiplication. */
export function toMinorUnits(value: { toString(): string } | string): number {
  const text = value.toString();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error("INVALID_PRICE");
  const [whole, fraction = ""] = text.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(result) || result <= 0) throw new Error("INVALID_PRICE");
  return result;
}

export function fromMinorUnits(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("INVALID_AMOUNT");
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}`;
}
