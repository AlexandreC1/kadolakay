/**
 * Shared constants used across the app.
 * Status badge colors live here so every page shows the same status in the
 * same color. They use the brand palette from globals.css, plus green/red/gray
 * for success, failure and inactive states.
 */

const NEUTRAL = "bg-gray-100 text-gray-700";
const PENDING = "bg-gold-400/10 text-gold-300";
const IN_PROGRESS = "bg-brand-500/15 text-brand-300";
const SUCCESS = "bg-green-500/15 text-green-300";
const DANGER = "bg-red-500/15 text-red-300";

/** Fallback for a status missing from the maps below. */
export const DEFAULT_BADGE_COLOR = NEUTRAL;

export const BUSINESS_STATUS_COLORS: Record<string, string> = {
  PENDING_REVIEW: PENDING,
  APPROVED: SUCCESS,
  SUSPENDED: DANGER,
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: PENDING,
  PAID: SUCCESS,
  CONFIRMED: IN_PROGRESS,
  SHIPPED: IN_PROGRESS,
  DELIVERED: SUCCESS,
  CANCELLED: NEUTRAL,
  REFUNDED: NEUTRAL,
  EXPIRED: NEUTRAL,
  PAYMENT_FAILED: DANGER,
  NEEDS_REFUND: DANGER,
};
