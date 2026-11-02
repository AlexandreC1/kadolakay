import { FoundationForm } from "@/components/shared/FoundationForm";
import { saveNewBasket, saveBasketDetails } from "@/actions/baskets";
import { workspaceCopy } from "@/lib/workspace-copy";
import { occasionLabel, occasionTypes } from "@/lib/occasions";
export function BasketDetails({
  locale,
  basket,
}: {
  locale: string;
  basket?: {
    id: string;
    title: string;
    recipientName: string | null;
    recipientMessage: string | null;
    kind: string;
    type: string;
  };
}) {
  const c = workspaceCopy(locale);
  return (
    <FoundationForm
      action={basket ? saveBasketDetails : saveNewBasket}
      label={basket ? c.save : c.createBasket}
      locale={locale}
    >
      {basket && <input type="hidden" name="basketId" value={basket.id} />}
      <label htmlFor="basket-title">{c.title}</label>
      <input
        id="basket-title"
        name="title"
        required
        minLength={2}
        maxLength={100}
        defaultValue={basket?.title}
      />
      <label htmlFor="recipient-name">{c.recipient}</label>
      <input
        id="recipient-name"
        name="recipientName"
        required
        maxLength={100}
        defaultValue={basket?.recipientName || ""}
      />
      <label htmlFor="recipient-message">{c.message}</label>
      <textarea
        id="recipient-message"
        name="recipientMessage"
        maxLength={1000}
        rows={3}
        defaultValue={basket?.recipientMessage || ""}
      />
      <label htmlFor="basket-mode">{c.mode}</label>
      <select
        id="basket-mode"
        name="kind"
        defaultValue={basket?.kind || "BASKET_SHARED"}
      >
        <option value="BASKET_SHARED">{c.shared}</option>
        <option value="BASKET_PERSONAL">{c.personal}</option>
      </select>
      <label htmlFor="basket-type">{c.occasion}</label>
      <select
        id="basket-type"
        name="type"
        defaultValue={basket?.type || "BIRTHDAY"}
      >
        {occasionTypes.map((t) => (
          <option value={t} key={t}>
            {occasionLabel(t, locale)}
          </option>
        ))}
      </select>
    </FoundationForm>
  );
}
