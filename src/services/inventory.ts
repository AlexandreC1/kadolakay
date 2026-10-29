import type { Prisma } from "@prisma/client";

type StockLine = { productId: string | null; quantity: number };

function quantitiesByProduct(lines: StockLine[]) {
  const quantities = new Map<string, number>();
  for (const line of lines) {
    if (!line.productId || !Number.isSafeInteger(line.quantity) || line.quantity < 1) throw new Error("INVENTORY_IDENTITY_MISSING");
    const quantity = (quantities.get(line.productId) || 0) + line.quantity;
    if (!Number.isSafeInteger(quantity)) throw new Error("INVALID_QUANTITY");
    quantities.set(line.productId, quantity);
  }
  // All checkout/expiry/fulfillment paths acquire SKU locks in the same order.
  return [...quantities].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
}

export async function reserveProductStock(tx: Prisma.TransactionClient, lines: StockLine[]) {
  for (const [id, quantity] of quantitiesByProduct(lines)) {
    const changed = await tx.$executeRaw`
      UPDATE products SET "reservedStock" = "reservedStock" + ${quantity}, "updatedAt" = NOW()
      WHERE id = ${id} AND "inStock" = TRUE AND "stockQuantity" IS NOT NULL
        AND "stockQuantity" - "reservedStock" >= ${quantity}
    `;
    if (changed !== 1) throw new Error("ITEM_UNAVAILABLE");
  }
}

/** Call only after claiming a pending order inside the same transaction. */
export async function settleProductStock(tx: Prisma.TransactionClient, lines: StockLine[], paid: boolean) {
  for (const [id, quantity] of quantitiesByProduct(lines)) {
    const consumed = paid ? quantity : 0;
    const changed = await tx.$executeRaw`
      UPDATE products SET "reservedStock" = "reservedStock" - ${quantity},
        "stockQuantity" = "stockQuantity" - ${consumed}, "updatedAt" = NOW()
      WHERE id = ${id} AND "reservedStock" >= ${quantity} AND "stockQuantity" >= ${quantity}
    `;
    if (changed !== 1) throw new Error("PRODUCT_RESERVATION_MISMATCH");
  }
}
