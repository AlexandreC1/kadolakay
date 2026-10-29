# KadoLakay decision log

### October 29: GitHub source checkpoint verified

Owner asked to continue and ensure everything was pushed. Created and pushed code checkpoint e9fdb70599e54e24da04688b0cc21cca48a341a8 on codex/ship-ready-mvp, verified exact remote hash plus0/0 divergence and clean working tree. Main unchanged; no deployment. Ignored environment secrets, runtime dependencies and local database remain local. A documentation follow-up records this verification. Existing basket/release blockers remain open and source synchronization must not imply product completion.

### October 29: optional-link crash fixed and source checkpoint requested

Blank Amazon field caused new URL("") to throw inside a Zod refinement before optional-URL fallback. URL parsing now never throws on malformed/blank input; optional whitespace/empty values are accepted and unsafe URLs remain rejected. Draft creation returns bounded field/auth/rate/service errors to the new form; legacy redirect behavior is preserved. Browser persistence and private draft rules verified, temporary test draft archived. Preserve filled values and reveal errors automatically. No schema change.

GitHub audit found the recent work uncommitted and the work branch absent remotely. Owner expects synchronization; prepare/push a source checkpoint after secret scan and verification. Record remote evidence before claiming synchronization. Do not treat pushed source as a deployed or ship-ready platform.

### October 28: registration errors must announce and reveal themselves

Required fields use explicit labels, not just asterisks. On failure show all invalid fields together in a focused, automatically revealed summary with links and matching inline messages. Preserve input and revalidate corrected fields on blur. Server failures use the same visible feedback area. Client validation reuses the strict server schema and never replaces server validation/authentication. Business registration migrated; do not claim app-wide coverage.

### October 28: orange Orders action identified and corrected

User identified Orders > My registries. Legacy hard-coded amber action replaced with shared mint buttonVariants, with semantic brand navigation links. Warning colors remain reserved for actual status/messages. Browser color/destination and targeted lint/TypeScript verified. The orange-control clarification is resolved.

### October 28: business patente and remaining button-color report

Added optional textual patente number to registration with bounded validation and nullable storage; no fabricated legal format, uniqueness, automatic verification or approval rule. Owner and reviewing admins can see it, public catalog cannot. Existing businesses remain valid. Registration retains entered details on invalid input. Submit uses the shared mint default style. Orange report is not reproduced on the current registration screen; request for exact label/page remains pending. Do not assert an unverified cause.

### October 28: implement the supplied occasion-picker direction

Owner's concrete occasion-pill reference supersedes the earlier generic task selector and further approval pause. Implemented profile/language then occasion selection, with Explore/Skip and six real registry types. Preserve approved mint/fonts/stars, substitute line icons for reference emojis, and route actual choices into the working draft form. No generic task cards or unbuilt basket button. Basket both-mode requirement remains pending implementation. Setup data is server-persisted; no client userId/role assignment, no automatic list publication. Additive local migration and checks recorded in HANDOFF.md.

### October 28: basket modes confirmed and onboarding requested

Owner confirmed both basket modes, chosen at creation: buy personally or share for others to choose gifts. They then explicitly requested researched onboarding before starting. Primary-source findings, proposed two-step setup, basket/creator/giver/merchant branches, privacy, safe callback persistence, failure states and acceptance gates are documented in ONBOARDING-BRIEF.md. Proposal preserves mint/Fraunces/Figtree/theme/stars choices. It does not require a photo, username or country without a real product need. Research proposal awaits review; no onboarding or basket runtime implementation is claimed.

### October 28: Presently wishlist reference

Owner selected the local prototype's progress card, font pairing, wishlist page and simple light/dark toggle while retaining earlier approved changes. Adopt Fraunces/Figtree and progress/filter composition; retain mint canvas/actions, Gravity Stars and no decorative arrows. Actual database quantities drive progress; payment holds never count as confirmed gifts. Partial quantities remain discoverable in relevant filters. Do not port fake reservation/purchase handlers or artwork. Single theme switch replaces popup; persist before starting transition. No new dependency, schema migration, paid service or deployment.

## Confirmed by owner

- Build a production-intended Haitian/diaspora gift registry and approved local merchant platform in HT/FR/EN.
- Professional original UI with purposeful 3D, real/authorized imagery, ocean blue/sand/coral, softer controls. No AI pictures, emoji, em dashes, generic demo substitutions, invented content or success claims.
- PMNDRS caustics and React Bits carousel are inspiration, not requests to copy them into the final homepage.
- Research and provide multiple comparable UI directions for selection and tweaks before final redesign.
- Infrastructure budget is $50 total for the first year. Start with free services.
- Scope/design/launch plan approved for implementation. Delegate where useful and preserve durable context for Claude Code.

## Engineering decisions, October 27, 2026

- Netlify pilot configuration added; no accounts provisioned or hosted deployment verified yet.
- Neon connection suggested, not confirmed. Never invent a database URL or ask for credentials pasted into chat.
- New purchases require `CHECKOUT_ENABLED=true` plus complete provider keys. Turning purchases off does not disable recovery or signed webhook handling for existing orders.
- Native checkout rejects custom, external, and Amazon gifts. Only linked merchant products are eligible, subject to fresh approval/availability/price checks.
- Keep hourly recovery opt-in on free-tier Netlify. Webhooks remain primary. Provider-unconfigured recovery returns before querying the database. A free-tier polling schedule must be measured, not assumed affordable.
- Only trust platform IP headers on their corresponding host; missing/invalid identity uses a shared rate-limit bucket instead of user-controlled forwarding values. Deployed header behavior still needs verification.
- Exact shared-address registry lookup is implemented. Name-based public search is deferred pending an explicit searchable/consent policy and data model.
- Registry-level serialization rejects duplicate catalog additions rather than silently increasing quantity. Physical warehouse stock is still not implemented.
- Catalog product editing is owner scoped and rejects pending checkout history. Shared stock, fulfillment and refunds remain release gates.

## Still required from owner

1. Legal registration country of the business receiving payments.
2. Seller of record, fulfillment party, service area, pickup/delivery terms, refunds, commissions and merchant settlement.
3. A / Lakou plus B product detail is selected. Review the actual implementation and remaining visual refinements.
4. Real merchant/product content and permission to use photography and model references.
5. Hosting/account connections and eventual domain name. No paid service is assumed approved.

Free-tier pilot is not a paid uptime guarantee. Transaction fees, refunds and delivery are not included in the infrastructure estimate until explicitly budgeted.

## Design selection confirmed October 27, 2026

The owner selected A: Lakou, family registry with B's product detail. This approves the family-first composition and maker/product-detail treatment. Keep Create and Find registry prominent, surface approved local merchants early, use softer controls, and show actual seller, price/currency, availability and fulfillment terms. It does not approve the old gift-box hero, carousel demo, placeholder vectors as final 3D, or fabricated merchant imagery. Next: refined coherent screens and a measured original basket-scene proof with static/mobile/reduced-motion fallbacks.

## Direct-interaction and motion refinement, October 27, 2026

Owner explicitly rejected the rotate button, excessive arrow gaps, lifeless flow and the pale previous color treatment. Remove the external scene button permanently. Interact directly with the basket using bounded pointer drag, touch horizontal drag, momentum and keyboard arrows/Home. Keep vertical page scrolling. Add scroll-linked scene/contents motion and staggered merchant/product reveals with reduced-motion and keyboard-access fallbacks. Header/primary arrow gaps are now 7px/8px. Current proposed color refinement uses deeper marine, vermilion and a cooler off-white; visual sign-off remains pending. Do not interpret the original bright palette as a command to undo this latest requested refinement.

## Further color and UX research, October 27, 2026
Owner still finds the UI bland. See COLOR-UX-RESEARCH.md for sourced diagnosis, proposed color roles, measured contrast pairs, composition changes and verification gates. These are recommendations, not approved replacements. No app palette changed during this research pass. Preserve A / Lakou plus B product detail and direct scene interaction.

## Color/composition implementation, October 27, 2026
Owner instructed implementation of COLOR-UX-RESEARCH.md. Homepage now has exact proposed ocean/coral roles, grouped primary action with dark text, relaxed headline tracking, bounded ocean scene, integrated light finder, content-count-aware single-merchant layout and sand-backed product section. Colors are scoped to the homepage, preserving transactional semantics. Basket cylinder lightened for scene separation. No generated bitmap assets, new rendering dependencies or invented merchant photography. Visual acceptance remains pending.

## Working finder feature, October 27, 2026
Owner asked for an actual working feature. Implemented an exact shared-address registry preview with title/occasion/date/gift count and direct View gifts navigation. Preserve privacy filters, separate controller/service boundaries, shared rate limiting and localized recovery. No name search or changed searchable-consent policy. Calendar dates now remain on the stored UTC day in preview/public/owner list. See latest HANDOFF for evidence and remaining platform gates.

## Registry sharing QR feature, October 27, 2026
Owner requires proactive useful registry-sharing features, including a scannable barcode. Standard QR code implemented with PNG download in Share dialog and published owner editor. Only public published unprotected registries qualify; no access bypass. Canonical links retain locale and configured site origin. Codes are server-generated without external services. Localhost limitation must remain explicit until actual hosting/domain configuration is verified. My registries leads to owner editor so draft owners can publish and then share.

## Homepage and directory scope correction, October 27, 2026
Owner rejected duplicate footer actions/slogan and concentrating merchant/product inventory on the homepage. Remove those sections rather than filling them with more demo cards. Homepage is an entry point; /browse owns searchable/filterable paginated businesses; storefront/product routes own full product information. Compact footer contains copyright only, no repeated nav or origin slogan. Direct useful Creole copy replaces vague headings. Directory must remain bounded and privacy-filtered with explicit empty/failure/stale-page recovery. Existing 3D is not evidence of completed product experience or visual approval.

## Guest scanning, October 27, 2026
Owner explicitly requires QR scanning from the registry finder, not just generating codes for owners. Implemented user-triggered camera and on-device saved-image scan with validated exact-address preview and manual fallback. Camera permission allowed on finder routes only, no microphone, tracks stopped when no longer needed. Frame/image data never sent to the server. Keep generated-code and scan entry paths connected in the product flow. Physical-camera verification still required before claiming device readiness.

## Downloaded QR must explain its destination, October 27, 2026
Owner explicitly rejects a bare QR download. Default downloaded PNG must be a complete share card with registry title, occasion, date when available, brand, scan instruction and readable link. Keep QR quiet zone clear; no logos over modules. Use localized copy and stored calendar date. Retain private/public eligibility checks. Font licensed and packaged locally for reliable server rendering; no third-party renderer. Existing already-downloaded bare files are historical; new downloads use registry-card filenames.

## Owner-supplied next UI references, October 27, 2026
Owner shared a local Claude prototype (original C:/Users/charl/Downloads/KadoLakay, prototype de refonte.html; review copy surrounding outputs/Claude-KadoLakay-prototype.html). Reviewed home, registry and four-step creation structure. Basket communicates offered-gift progress; prototype is SVG/client-state demonstration with no real login/payment/persistence. Treat it as a proposed stronger UI reference, not authorization to replace secure backend logic or mark client state as paid. Original HTML remains untouched.

Owner subsequently proposed these Animate UI references:
- Gravity Stars: https://animate-ui.com/docs/backgrounds/gravity-stars. Proposed restrained atmospheric effect behind a hero; preserve readable search/card surfaces, bounded particles, hidden/offscreen pause and reduced motion. Not implemented yet.
- Theme Toggler: https://animate-ui.com/docs/primitives/animate-ui/theme-toggler. Proposed visitor Light/Dark/System selection beside language, persisted preference with transition fallback/reduced motion. This is separate from operator brand/theme/seasonal management. Not implemented yet.
- Tilt on items: https://animate-ui.com/docs/primitives/animate-ui/tilt. Proposed gentle product-image tilt (about4-6degrees), retaining stable price/availability/action controls and normal touch scrolling. Flat on touch/coarse pointer/reduced motion. Pointer transforms are presentation, not a product3D model. Not implemented yet.

Do not report these reference discussions as completed application features, and do not paste standalone decorative demos as the product redesign. Integrate with actual gift/registry tasks when implementing the next coherent UI pass.

## Visitor theme feature completed, October 27, 2026
Light/Dark/System is now implemented with a persisted preference, server rendering, semantic shared colors, desktop/mobile controls and native transition/reduced-motion fallback. It does not change operator brand/seasonal settings and does not implement the Gravity Stars, Tilt or Claude layout reference. Remaining statuses are explicit in FEATURE-STATUS.md. No new dependency or hosting cost.

### October28: batch gift selection and reference boundaries
Multiple selector means bulk catalog gift selection, not account-role or language selection. Batch maximum20; entire batch commits or rejects. Approval/availability/prices rechecked under database locks. Preserve single-add compatibility. Decorative homepage3D removed until it serves a real task. Appearance gets icon trigger with explicit choices. Claude prototype supplies UX/business inspiration only; no palette approval inferred. Spectrum source remained gated, so login is an original adaptation of visible public preview with actual configured providers only.

### October28: use public Spectrum source and guide Google setup
Correct prior conclusion that gated docs prevented component use: public upstream source exists. Actual card source adapted under Apache2 attribution. Motion implemented with CSS to preserve low-bandwidth/reduced-motion requirements. Empty provider setup shows disabled documented controls, not fake working sign-in. Owner chose guided Google OAuth client creation; secure local interactive helper prepared, no credentials in chat or artifacts. Real callback verification awaits user configuration.

### October28: Google local login activated and verified
Created separateGoogleCloudproject kadolakay,appExternal/Test,localwebclientand1ownertestuser. OwnerapprovedAPIuserdata-policyacceptance,basicprofile/emailconsentandperformedcredentialcreation. Existingmaskedsecret couldnotberecovered; ownermanagedreplacement. Exactduplicatepaste removedlocally,toolrejectsmasks/repeats. GenuineOAuthcallback,sessionreload,signoutandrepeatloginverified. No automaticaccountlinking,authbypass,PKCEdisableorrolepromotion. ProductionGooglepublication/hostedcallback is a separateunfinishedgate.

### October 28: owner-selected mint brand color
Owner chose Spectrum HSL 170.6 76.9% 64.3%, approximately #5EEAD4. This replaces the former blue/coral primary accent. Exact HSL is the canonical --brand-accent token. Primary actions and logo detail use mint with evergreen labels; light-mode text links use a deeper same-hue color, dark-mode links use mint. Error/warning colors remain semantic. Updated hover roles so dark labels never sit on the old dark-blue hover background. QR share-card identity and favicon follow the new color. No auth, payment or database behavior changed.

### October 28: exact pale-mint background plus Gravity Stars
Owner selected HSL 166.2 76.5% 96.7% for the app background and retained existing mint buttons. Light canvas is #F0FDFA; dark-mode preference remains functional. Integrated actual Animate UI Gravity Stars source, with retained MIT + Commons Clause license and attribution. Native lifecycle hooks replace Motion dependency. Fixed viewport canvas sits behind content without pointer interception; controls remain opaque. A localized pause button is last in DOM to preserve the skip-link-first focus order. Reduced motion holds stars still, hidden tabs stop the loop, pointer attraction resets on leave/blur, touch scrolling is unaffected. Desktop/mobile and pixel budgets are bounded. No backend behavior changes.

### October 28: remove decorative arrows
Owner rejected decorative arrows. Removed them from action/link labels across homepage, header sign-in, finder, directory, recovery states, legacy hero and OG preview. Social provider buttons keep loading spinners but no trailing arrows. Actual navigation controls and the icon-only email submit remain functional. Do not reintroduce decorative arrows as a styling convention.

### October 29: dependency baseline and Prisma driver
Use stable Prisma7.10.1 with PostgreSQL adapter and bounded pool; no prerelease8 migration or vulnerable transitive overrides. CLI uses direct URL when provided, runtime uses application URL. Full npm audit clean after compatible fixes and Vitest5 upgrade. Keep production rate limiter fail-closed; local production verification cannot bypass missing shared Redis. Existing stock unknown until merchant enters a physical count.

### October 29: shared inventory and retry semantics
Physical count includes held unsold units; null is unconfirmed, not unlimited. Reserve at checkout across every registry, consume on verified payment, release only after provider-confirmed nonpayment. Never automatically restock refunds. Order lines snapshot SKU identity and preserve financial references. Legacy pending local orders must be reconciled before migration. Client attempts carry a private random capability; identical retries resume one order. Changed payload/identity rejects, no new ambiguous sessions after5min, stable35min expiry preserves provider idempotency. Provider creation errors retain holds until reconciliation, including409/429. Resume is a separate rate-limited capability action; signed-in attempts stay bound to their buyer. All payment activation and operational gates remain unchanged.

### October 29: Bayou app name
Owner explicitly renamed KadoLakay to Bayou. Use Bayou in all current product copy and branding; historical engineering notes and third-party notices remain historical. Preserve mint palette/fonts. Use a B monogram instead of the K mark. Do not rename domains, repository, OAuth identifiers, database, cookies, rate-limit keys or checkout capabilities through text replacement. Email display-name changes must preserve the verified sender address. New orders use BY-; existing KL- orders retain original Stripe descriptions on retries. External Google consent branding still needs a separate configuration update.
