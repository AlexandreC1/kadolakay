-- Fees are a future product decision. Preserve existing records and financial
-- history; new merchants must not silently inherit an unapproved commission.
ALTER TABLE businesses ALTER COLUMN "commissionRate" SET DEFAULT 0.0;
