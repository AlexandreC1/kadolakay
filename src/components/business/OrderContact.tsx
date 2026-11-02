import { contactCopy } from "@/lib/contact-copy";
import { workspaceCopy } from "@/lib/workspace-copy";
import { FoundationForm } from "@/components/shared/FoundationForm";
import { saveDeliveryContact } from "@/actions/workspaces";
import type { readOrderContact } from "@/services/order-contact";
type Contact = Awaited<ReturnType<typeof readOrderContact>>;
export function OrderContact({
  locale,
  contact,
  orderId,
  editable = false,
  action = saveDeliveryContact,
}: {
  locale: string;
  contact: Contact;
  orderId: string;
  editable?: boolean;
  action?: typeof saveDeliveryContact;
}) {
  const c = contactCopy(locale);
  return (
    <section className="foundation-panel workspace-section">
      <h2>{c.title}</h2>
      {editable ? (
        <FoundationForm
          action={action}
          locale={locale}
          label={workspaceCopy(locale).save}
        >
          <input type="hidden" name="orderId" value={orderId} />
          {(
            [
              ["recipientName", c.name, 100],
              ["phone", c.phone, 16],
              ["city", c.city, 100],
              ["address", c.address, 500],
              ["instructions", c.instructions, 500],
            ] as const
          ).map(([name, label, max]) => (
            <div key={name}>
              <label htmlFor={name}>{label}</label>
              <input
                id={name}
                name={name}
                defaultValue={contact?.[name] || ""}
                maxLength={max}
                required={name !== "instructions"}
                type={name === "phone" ? "tel" : "text"}
                pattern={name === "phone" ? "\\+[1-9][0-9]{7,14}" : undefined}
                placeholder={name === "phone" ? "+50912345678" : undefined}
              />
            </div>
          ))}
          <p className="foundation-note">{c.hint}</p>
        </FoundationForm>
      ) : contact ? (
        <address className="not-italic">
          <p>{contact.recipientName}</p>
          <p>{contact.phone}</p>
          <p>
            {contact.address}, {contact.city}
          </p>
          {contact.instructions && <p>{contact.instructions}</p>}
        </address>
      ) : (
        <p>{workspaceCopy(locale).empty}</p>
      )}
    </section>
  );
}
