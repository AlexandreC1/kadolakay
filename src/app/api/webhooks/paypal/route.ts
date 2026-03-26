import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paypalProvider } from "@/lib/payments/paypal";

// PayPal redirects the user back after approval
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token"); // PayPal order ID

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    // Capture the payment
    const result = await paypalProvider.verifyPayment({
      transactionId: token,
    });

    if (result.success) {
      // Find payment by PayPal order ID
      const payment = await db.payment.findFirst({
        where: {
          paypalOrderId: token,
          provider: "PAYPAL",
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
      });

      if (payment) {
        await db.payment.update({
          where: { id: payment.id },
          data: {
            status: "COMPLETED",
            paidAt: new Date(),
            providerResponse: result.rawResponse as object,
          },
        });

        await db.order.update({
          where: { id: payment.orderId },
          data: { status: "PAID" },
        });

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

    return NextResponse.redirect(new URL("/?payment=failed", req.url));
  } catch (error) {
    console.error("PayPal webhook error:", error);
    return NextResponse.redirect(new URL("/?payment=error", req.url));
  }
}
