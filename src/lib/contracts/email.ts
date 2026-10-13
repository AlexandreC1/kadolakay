/**
 * Email outbox contract (plan §4.3). Implemented by WS4 in src/lib/email/**
 * on top of the `email_outbox` table (src/lib/email/outbox.ts).
 */
import type { Currency } from "../money";

export interface EmailPayloads {
  "gift-notification": {
    recipientName: string;
    buyerName: string;
    giftMessage: string | null;
    itemNames: string[];
    registryTitle: string;
    registrySlug: string;
    orderNumber: string;
  };
  "order-receipt": {
    buyerName: string;
    itemNames: string[];
    registryTitle: string;
    orderNumber: string;
    /** Decimal string, e.g. "1250.00". */
    totalAmount: string;
    currency: Currency;
  };
  "natcash-instructions": {
    buyerName: string;
    orderNumber: string;
    amountHTG: string;
    merchantNumber: string;
    instructionsUrl: string;
  };
  "order-shipped": { buyerName: string; orderNumber: string; businessName: string };
  "payment-rejected": { buyerName: string; orderNumber: string; reason: string };
  "account-deleted": { name: string | null };
  "data-export-ready": { name: string | null; downloadUrl: string; expiresAt: string };
  "contact-form": { fromName: string; fromEmail: string; message: string };
}

export type EmailTemplate = keyof EmailPayloads;
export type EmailLocale = "ht" | "fr" | "en";

export interface EnqueueEmailInput<T extends EmailTemplate = EmailTemplate> {
  template: T;
  to: string;
  payload: EmailPayloads[T];
  /** `<entity>:<id>:<template>`, e.g. `order:ckx…:gift-notification`. Unique. */
  dedupeKey: string;
  locale?: EmailLocale;
  sendAfter?: Date;
}

/** Must never throw on duplicates (dedupeKey already queued → resolve silently). */
export type EnqueueEmail = <T extends EmailTemplate>(input: EnqueueEmailInput<T>) => Promise<void>;

export function emailDedupeKey(entity: string, id: string, template: EmailTemplate): string {
  return `${entity}:${id}:${template}`;
}
