-- Existing pending checkouts did not hold physical SKU stock. Reconcile those
-- sessions with the provider before deployment; never invent/backfill counts.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM order_items oi
    JOIN orders o ON o.id = oi."orderId"
    JOIN registry_items ri ON ri.id = oi."registryItemId"
    WHERE o.status = 'PENDING' AND ri.source = 'LOCAL_BUSINESS'
  ) THEN
    RAISE EXCEPTION 'Reconcile pending local-product checkouts before applying shared inventory';
  END IF;
END $$;

ALTER TABLE products ADD COLUMN "stockQuantity" INTEGER,
  ADD COLUMN "reservedStock" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD CONSTRAINT products_stock_bounds CHECK (
  "reservedStock" >= 0 AND
  (("stockQuantity" IS NULL AND "reservedStock" = 0) OR
   ("stockQuantity" IS NOT NULL AND "stockQuantity" >= 0 AND "reservedStock" <= "stockQuantity"))
);
ALTER TABLE order_items ADD COLUMN "productId" TEXT;
CREATE INDEX "order_items_productId_idx" ON order_items("productId");
ALTER TABLE order_items ADD CONSTRAINT "order_items_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE;
