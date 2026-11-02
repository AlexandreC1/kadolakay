export type FoundationReason =
  | "contactLocked"
  | "codeInvalid"
  | "setupUnavailable"
  | "requestPending"
  | "tooLate"
  | "paymentRequired"
  | "passwordRequired"
  | "limited"
  | "mfaLocked";
export type FoundationResult = {
  reason?: FoundationReason;
  status: "idle" | "saved" | "invalid" | "unavailable" | "premium" | "mfa";
};
