ALTER TABLE orders ADD COLUMN "checkoutRequestId" TEXT,
  ADD COLUMN "checkoutRequestHash" TEXT;
CREATE UNIQUE INDEX "orders_checkoutRequestId_key" ON orders("checkoutRequestId");
ALTER TABLE payments ADD COLUMN "checkoutUrl" TEXT;
