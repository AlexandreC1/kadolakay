import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { moncashProvider } from "@/lib/payments/moncash";

// MonCash redirects the user back with a transactionId query param
// This route handles the return URL callback
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const transactionId = searchParams.get("transactionId");

  if (!transactionId) {
    return NextResponse.json(
      { error: "Missing transactionId" },
      { status: 400 }
    );
  }

  try {
    // Verify with MonCash API
    const result = await moncashProvider.verifyPayment({ transactionId });

    if (result.success) {
      // Find payment by moncash transaction ID
      const payment = await db.payment.findFirst({
        where: {
          provider: "MONCASH",
          status: { not: "COMPLETED" },
        },
        include: {
          order: {
            include: {
              items: {
                include: { registryItem: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (payment) {
        // Update payment
        await db.payment.update({
          where: { id: payment.id },
          data: {
            status: "COMPLETED",
            moncashTxId: transactionId,
            paidAt: new Date(),
            providerResponse: result.rawResponse as object,
          },
        });

        // Update order
        await db.order.update({
          where: { id: payment.orderId },
          data: { status: "PAID" },
        });

        // Update registry item fulfillment
        for (const oi of payment.order.items) {
          const newFulfilled = oi.registryItem.fulfilledQty + oi.quantity;
          await db.registryItem.update({
            where: { id: oi.registryItemId },
            data: {
              fulfilledQty: newFulfilled,
              status:
                newFulfilled >= oi.registryItem.quantity
                  ? "FULFILLED"
                  : "PARTIALLY_FULFILLED",
            },
          });
        }

        // Redirect to success page
        const registryItem = payment.order.items[0]?.registryItem;
        if (registryItem) {
          const registry = await db.registry.findFirst({
            where: { items: { some: { id: registryItem.id } } },
            select: { slug: true },
          });
          if (registry) {
            return NextResponse.redirect(
              new URL(
                `/r/${registry.slug}?order=${payment.order.orderNumber}&status=success`,
                req.url
              )
            );
          }
        }
      }
    }

    // Fallback redirect
    return NextResponse.redirect(new URL("/?payment=failed", req.url));
  } catch (error) {
    console.error("MonCash webhook error:", error);
    return NextResponse.redirect(new URL("/?payment=error", req.url));
  }
}
