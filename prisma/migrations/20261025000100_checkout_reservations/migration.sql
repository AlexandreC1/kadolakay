ALTER TABLE "registry_items" ADD COLUMN "reservedQty" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "registry_items" ADD CONSTRAINT "registry_items_stock_nonnegative"
CHECK ("quantity" > 0 AND "fulfilledQty" >= 0 AND "reservedQty" >= 0 AND "fulfilledQty" + "reservedQty" <= "quantity");
CREATE INDEX "registries_status_isPublic_createdAt_idx" ON "registries"("status", "isPublic", "createdAt");
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");
CREATE INDEX "order_items_registryItemId_idx" ON "order_items"("registryItemId");
