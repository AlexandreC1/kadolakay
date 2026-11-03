import { FoundationForm } from "@/components/shared/FoundationForm";
import { workspaceCopy } from "@/lib/workspace-copy";
import { saveFulfillment, saveRefundRecord, saveRequestDecision } from "@/actions/workspaces";
import { RefundRecordNote, type RefundRecord } from "./RefundRecordNote";
import {
  fulfillmentTransitions,
  refundMethods,
  type FulfillmentState,
} from "@/services/order-operations";
export function OrderOperationPanel({
  locale,
  orderId,
  businessId,
  current,
  request,
  override = false,
  canFulfill = true,
}: {
  locale: string;
  orderId: string;
  businessId: string;
  current: {
    state: string;
    method: string;
    instructions: string | null;
  } | null;
  request: ({ id: string; state: string; kind: string; reason: string } & RefundRecord) | null;
  override?: boolean;
  canFulfill?: boolean;
}) {
  const c = workspaceCopy(locale),
    state = (current?.state || "NEW") as FulfillmentState,
    next = fulfillmentTransitions[state] || [];
  return (
    <section className="workspace-section">
      <p>
        {c.status}: {c[state]}
      </p>
      {current?.instructions && <p>{current.instructions}</p>}
      {request ? (
        <section>
          <h3>{c.refunds}</h3>
          <p>
            {c[request.state as "REQUESTED"] || request.state}: {request.reason}
          </p>
          <RefundRecordNote locale={locale} request={request} />
          {request.state !== "REFUNDED" && <p className="foundation-note">{c.refundNotice}</p>}
          {request.state === "ACCEPTED" && (
            <FoundationForm action={saveRefundRecord} locale={locale} label={c.recordRefund}>
              <input type="hidden" name="requestId" value={request.id} />
              {override && <input type="hidden" name="businessId" value={businessId} />}
              <p className="foundation-note">{c.recordRefundHint}</p>
              <label htmlFor={`refund-method-${request.id}`}>{c.refundMethod}</label>
              <select id={`refund-method-${request.id}`} name="method" defaultValue="MONCASH">
                {refundMethods.map((m) => (
                  <option value={m} key={m}>
                    {c[m]}
                  </option>
                ))}
              </select>
              <label htmlFor={`refund-reference-${request.id}`}>{c.refundReference}</label>
              <input
                id={`refund-reference-${request.id}`}
                name="reference"
                maxLength={100}
                autoComplete="off"
                aria-describedby={`refund-reference-hint-${request.id}`}
              />
              <p className="foundation-note" id={`refund-reference-hint-${request.id}`}>
                {c.refundReferenceHint}
              </p>
            </FoundationForm>
          )}
          {request.state === "REQUESTED" && (
            <FoundationForm
              action={saveRequestDecision}
              locale={locale}
              label={c.save}
            >
              <input type="hidden" name="requestId" value={request.id} />
              {override && (
                <input type="hidden" name="businessId" value={businessId} />
              )}
              <label htmlFor={`decision-${request.id}`}>{c.status}</label>
              <select id={`decision-${request.id}`} name="state">
                <option value="ACCEPTED">{c.ACCEPTED}</option>
                <option value="DECLINED">{c.DECLINED}</option>
              </select>
            </FoundationForm>
          )}
        </section>
      ) : null}
      {canFulfill &&
        next.length > 0 &&
        (!request ||
          request.state === "DECLINED" ||
          request.state === "WITHDRAWN") && (
          <FoundationForm
            action={saveFulfillment}
            locale={locale}
            label={c.update}
          >
            <input type="hidden" name="orderId" value={orderId} />
            {override && (
              <input type="hidden" name="businessId" value={businessId} />
            )}
            <label htmlFor={`state-${orderId}-${businessId}`}>{c.status}</label>
            <select id={`state-${orderId}-${businessId}`} name="state">
              {next
                .filter(
                  (n) =>
                    !(current?.method === "PICKUP" && n === "SHIPPED") &&
                    !(
                      current?.method === "DELIVERY" &&
                      state === "READY" &&
                      n === "DELIVERED"
                    ),
                )
                .map((n) => (
                  <option value={n} key={n}>
                    {c[n]}
                  </option>
                ))}
            </select>
            <label htmlFor={`method-${orderId}-${businessId}`}>
              {c.delivery} / {c.pickup}
            </label>
            <select
              id={`method-${orderId}-${businessId}`}
              name="method"
              defaultValue={current?.method || "PICKUP"}
            >
              {(!current || current.method === "PICKUP") && (
                <option value="PICKUP">{c.pickup}</option>
              )}
              {(!current || current.method === "DELIVERY") && (
                <option value="DELIVERY">{c.delivery}</option>
              )}
            </select>
            <label htmlFor={`instructions-${orderId}-${businessId}`}>
              {c.instructions}
            </label>
            <textarea
              id={`instructions-${orderId}-${businessId}`}
              name="instructions"
              maxLength={1000}
              rows={3}
              defaultValue={current?.instructions || ""}
            />
          </FoundationForm>
        )}
    </section>
  );
}
