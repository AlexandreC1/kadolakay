ALTER TABLE orders ADD COLUMN "checkoutLocale" TEXT;
-- Pre-release local retry records, if any, lack routing metadata. Do not guess
-- their language or start another provider session; reconciliation stays valid.
