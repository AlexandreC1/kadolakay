import { workspaceCopy } from "@/lib/workspace-copy";

export type RefundRecord = {
  state: string;
  refundMethod?: string | null;
  refundReference?: string | null;
  refundedAt?: Date | null;
};

/** Shows a merchant-recorded refund. Labelled as the merchant's record, never as provider-confirmed. */
export function RefundRecordNote({ locale, request }: { locale: string; request: RefundRecord }) {
  if (request.state !== "REFUNDED" || !request.refundMethod || !request.refundedAt) return null;
  const c = workspaceCopy(locale);
  const method = c[request.refundMethod as "MONCASH"] || request.refundMethod;
  const date = new Intl.DateTimeFormat(locale === "ht" ? "fr-HT" : locale, { dateStyle: "medium" }).format(request.refundedAt);
  return (
    <div className="foundation-note" role="status">
      <p>
        <strong>{c.refundRecorded}</strong>: {method}
        {request.refundReference ? ` · ${c.refundReference}: ${request.refundReference}` : ""} · {date}
      </p>
      <p>{c.refundRecordedNote}</p>
    </div>
  );
}
