/**
 * Decimal money helpers (plan §4.5): never use JS floats for money.
 * Prisma.Decimal is decimal.js; values are rounded half-up to 2 places.
 */
import { Prisma } from "@prisma/client";

export type Money = Prisma.Decimal;
export type Currency = "HTG" | "USD";
export const CURRENCIES: readonly Currency[] = ["HTG", "USD"] as const;

const D = Prisma.Decimal;

/** Parse a number/string/Decimal. Throws on NaN, Infinity or non-numeric strings. */
export function money(value: Prisma.Decimal.Value): Money {
  const d = new D(value);
  if (!d.isFinite()) throw new RangeError("Invalid money value");
  return d.toDecimalPlaces(2, D.ROUND_HALF_UP);
}

/** money() for nullable DB columns. */
export function moneyOrNull(value: Prisma.Decimal.Value | null | undefined): Money | null {
  return value === null || value === undefined ? null : money(value);
}

export const ZERO: Money = new D(0);

export function sum(values: Money[]): Money {
  return values.reduce((acc, v) => acc.plus(v), ZERO).toDecimalPlaces(2, D.ROUND_HALF_UP);
}

export function multiply(unit: Money, qty: number): Money {
  if (!Number.isInteger(qty) || qty < 0) throw new RangeError("Quantity must be a non-negative integer");
  return unit.times(qty).toDecimalPlaces(2, D.ROUND_HALF_UP);
}

/** Percentage fee, e.g. percentOf(total, 5) for the 5% platform fee. */
export function percentOf(amount: Money, percent: Prisma.Decimal.Value): Money {
  return amount.times(percent).dividedBy(100).toDecimalPlaces(2, D.ROUND_HALF_UP);
}

/** Integer minor units (cents/centimes) for Stripe unit_amount. */
export function toMinorUnits(amount: Money): number {
  return amount.times(100).toDecimalPlaces(0, D.ROUND_HALF_UP).toNumber();
}

export function fromMinorUnits(minor: number): Money {
  if (!Number.isInteger(minor)) throw new RangeError("Minor units must be an integer");
  return new D(minor).dividedBy(100);
}

/** "1250.00" — for provider APIs (PayPal value) and serialization. */
export function toFixed2(amount: Money): string {
  return amount.toFixed(2);
}

export function isPositive(amount: Money | null | undefined): amount is Money {
  return !!amount && amount.greaterThan(0);
}
