import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { stripe } from "@/lib/payments/stripe";
import { Link } from "@/i18n/navigation";
import { CheckCircle2, Clock3 } from "lucide-react";

const labels = {
  en: { refunded: "Payment refunded", refundedBody: "This payment has been marked refunded. Contact the merchant about the gift and refund timing.", confirmed: "Your gift is confirmed", confirmedBody: "Your payment has been recorded and your gift is reserved for the registry owner.", failed: "This checkout was not completed", failedBody: "No gift has been confirmed for this checkout. Return to the registry to try again or contact the merchant if you were charged.", pending: "Your payment is being confirmed", body: "We confirm gifts only after Stripe reports a successful payment. If you have just paid, wait a moment and refresh this page.", back: "Back to the registry", receipt: "Order", total: "Total" },
  fr: { refunded: "Paiement remboursé", refundedBody: "Ce paiement est marqué remboursé. Contactez le commerçant au sujet du cadeau et du délai de remboursement.", confirmed: "Votre cadeau est confirmé", confirmedBody: "Votre paiement a été enregistré et votre cadeau est réservé pour le propriétaire du registre.", failed: "Ce paiement n’a pas été finalisé", failedBody: "Aucun cadeau n’a été confirmé. Revenez au registre pour réessayer ou contactez le commerçant si vous avez été débité.", pending: "Confirmation du paiement en cours", body: "Nous confirmons le cadeau après la validation du paiement par Stripe. Si vous venez de payer, patientez puis actualisez cette page.", back: "Retour au registre", receipt: "Commande", total: "Total" },
  ht: { refunded: "Peman ranbouse", refundedBody: "Yo make peman sa a kòm ranbouse. Kontakte machann nan pou kado a ak delè ranbousman an.", confirmed: "Kado ou konfime", confirmedBody: "Peman ou anrejistre epi kado a rezève pou mèt rejis la.", failed: "Peman sa a pa fini", failedBody: "Nou pa konfime okenn kado pou peman sa a. Retounen nan rejis la pou eseye ankò oswa kontakte machann nan si yo te pran lajan an.", pending: "N ap konfime peman ou", body: "Nou konfime kado a sèlman lè Stripe konfime peman an. Si ou fèk peye, tann yon ti moman epi rafrechi paj la.", back: "Retounen nan rejis la", receipt: "Kòmand", total: "Total" },
};

export default async function CheckoutSuccessPage({ params, searchParams }: {
  params: Promise<{ slug: string; locale: string }>; searchParams: Promise<{ session_id?: string }>;
}) {
  const { slug, locale } = await params;
  const { session_id: sessionId } = await searchParams;
  if (!sessionId || !/^cs_(test_|live_)?[a-zA-Z0-9_]+$/.test(sessionId) || sessionId.length > 255) notFound();
  let orderId: string | undefined;
  try { const session = await stripe.checkout.sessions.retrieve(sessionId); orderId = session.metadata?.orderId; } catch { notFound(); }
  const order = orderId ? await db.order.findFirst({
    where: { id: orderId, payment: { stripePaymentId: sessionId }, items: { every: { registryItem: { registry: { slug } } } } },
    select: { status: true, orderNumber: true, totalUSD: true },
  }) : null;
  if (!order) notFound();
  const c = labels[locale as keyof typeof labels] || labels.ht;
  const paid = ["PAID", "CONFIRMED", "SHIPPED", "DELIVERED"].includes(order.status);
  const refunded = order.status === "REFUNDED";
  const failed = order.status === "CANCELLED";
  const Icon = paid ? CheckCircle2 : Clock3;
  return <div className="mx-auto max-w-lg px-5 py-20"><Icon size={40} className="mb-6 text-emerald-800" aria-hidden="true" /><h1 className="text-3xl font-semibold">{paid ? c.confirmed : refunded ? c.refunded : failed ? c.failed : c.pending}</h1><p role="status" className="mt-4 leading-relaxed text-gray-600">{paid ? c.confirmedBody : refunded ? c.refundedBody : failed ? c.failedBody : c.body}</p><dl className="my-8 space-y-4 border-y py-6"><div><dt className="text-sm text-gray-600">{c.receipt}</dt><dd className="break-all font-medium">{order.orderNumber}</dd></div><div><dt className="text-sm text-gray-600">{c.total}</dt><dd className="font-medium">${Number(order.totalUSD).toFixed(2)} USD</dd></div></dl><Link href={`/r/${slug}`} className="font-semibold underline underline-offset-4">{c.back}</Link></div>;
}
