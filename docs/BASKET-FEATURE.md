# Gift baskets for another person

Requested October 28, 2026. Owner confirmed both modes, with a choice when creating the basket: creator purchase, or share so others can choose gifts. The subsequent onboarding research is in ONBOARDING-BRIEF.md. This is a new product flow, not a decorative homepage basket. Implementation remains pending; live checkout must respect the existing commercial gates.

## Common experience

1. Creator signs in, names the basket, and supplies a recipient display name and optional gift message. No recipient account, email, phone or delivery address is required for curation. Do not create an account for the recipient or notify them automatically.
2. Add several products from approved local merchants using the existing catalog picker, or add a product's store link with a title and optional stated price. Do not imply relationships with retailers shown in the reference. No arbitrary server-side URL fetching or automatic scraping.
3. Review items, quantities, sellers and currencies. Prices from the local catalog come from the server. External stated prices are estimates and do not become payable balances. Never combine USD and HTG into a misleading total.
4. Choose from a small accessible set of presentation styles with a live preview. Styles apply to the basket presentation only. Preserve the owner's approved app colors, typography, light/dark switch and Gravity Stars.
5. Save a private draft, then explicitly share a recipient-facing preview. A recipient display name or message becomes visible only when the creator chooses to share. No public name discovery by default. The creator retains editing rights; possession of a share link does not grant mutation rights.

## Payment decision

A shared collection uses gift-level availability and verified fulfillment. It must not count payment holds as confirmed gifts or invent group-funding accounting.

A creator-purchased basket requires an authoritative multi-item checkout, fresh approval and price checks, atomic reservations, provider verification, idempotency, cancellation/reconciliation and explicit delivery/refund terms. External store items remain separate purchases. Existing native checkout is disabled pending commercial/provider gates; this feature must not bypass that decision or promise unavailable delivery.

## Acceptance checks

- Creator can create, reload, edit and remove their draft's items.
- Other users and anonymous requests cannot edit, enumerate or open private drafts.
- Strict runtime schemas reject unknown fields, client owner IDs, executable URLs, invalid quantities, unsupported styles and invalid amounts.
- Catalog changes/suspension are rechecked before additions or payments. Concurrent writes cannot lose items or exceed limits.
- Recipient/message text renders literally; URLs do not execute code; external links use safe opener/referrer behavior.
- Selected style persists without overriding global appearance preference. Keyboard selection, mobile layout, long names and empty/error states remain usable in HT/FR/EN.
- No fake payment, delivery, retailer partnership, generated product artwork, decorative arrows or success claims.
