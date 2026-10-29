CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");
CREATE INDEX "registries_userId_status_updatedAt_idx" ON "registries"("userId", "status", "updatedAt");
CREATE INDEX "businesses_status_name_idx" ON "businesses"("status", "name");
CREATE INDEX "products_inStock_name_id_idx" ON "products"("inStock", "name", "id");
CREATE INDEX "orders_status_createdAt_idx" ON "orders"("status", "createdAt");
ALTER TABLE "registry_items" ADD CONSTRAINT "registry_items_prices_positive" CHECK (("priceUSD" IS NULL OR "priceUSD" > 0) AND ("priceHTG" IS NULL OR "priceHTG" > 0));
ALTER TABLE "products" ADD CONSTRAINT "products_prices_positive" CHECK (("priceUSD" IS NULL OR "priceUSD" > 0) AND ("priceHTG" IS NULL OR "priceHTG" > 0));
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_positive" CHECK ("quantity" > 0);
