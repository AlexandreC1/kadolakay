/**
 * Shared constants used across the app.
 * Extracted here to eliminate duplication — these maps were defined
 * independently in 4+ files before.
 */

export const REGISTRY_TYPE_EMOJI: Record<string, string> = {
  BABY_SHOWER: "👶",
  WEDDING: "💍",
  BIRTHDAY: "🎂",
};

export const STATUS_BADGE_COLORS: Record<string, string> = {
  PENDING_REVIEW: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  SUSPENDED: "bg-red-100 text-red-700",
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  PAID: "bg-green-100 text-green-700",
  COMPLETED: "bg-green-100 text-green-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  SHIPPED: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-600",
  FAILED: "bg-red-100 text-red-800",
};
