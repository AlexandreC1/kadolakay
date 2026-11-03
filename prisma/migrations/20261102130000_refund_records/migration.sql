-- Additive: record that an accepted cancellation/refund was paid back outside Bayou.
-- Evidence only. Payment, order and stock rows are not changed by recording it.
ALTER TABLE "refund_requests" ADD COLUMN "refundMethod" VARCHAR(20);
ALTER TABLE "refund_requests" ADD COLUMN "refundReference" VARCHAR(100);
ALTER TABLE "refund_requests" ADD COLUMN "refundedAt" TIMESTAMP(3);
ALTER TABLE "refund_requests" ADD COLUMN "refundRecordedBy" TEXT;

-- Widen the allowed states to include REFUNDED (same values as before plus one).
ALTER TABLE "refund_requests" DROP CONSTRAINT refund_request_state_valid;
ALTER TABLE "refund_requests" ADD CONSTRAINT refund_request_state_valid CHECK (state IN ('REQUESTED','ACCEPTED','DECLINED','WITHDRAWN','REFUNDED'));
ALTER TABLE "refund_requests" ADD CONSTRAINT refund_method_valid CHECK ("refundMethod" IS NULL OR "refundMethod" IN ('MONCASH','NATCASH','BANK_TRANSFER','CARD','CASH','OTHER'));
-- A REFUNDED row always carries who recorded it, how and when; other states carry none of it.
ALTER TABLE "refund_requests" ADD CONSTRAINT refund_record_complete CHECK (
  (state = 'REFUNDED' AND "refundMethod" IS NOT NULL AND "refundedAt" IS NOT NULL AND "refundRecordedBy" IS NOT NULL)
  OR (state <> 'REFUNDED' AND "refundMethod" IS NULL AND "refundReference" IS NULL AND "refundedAt" IS NULL AND "refundRecordedBy" IS NULL)
);
