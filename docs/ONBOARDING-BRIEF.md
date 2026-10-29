# KadoLakay onboarding: research and implementation brief

October 28, 2026. Initial research proposal, followed by the implementation status below. Older proposal sections describe the broader intended journey and must not be confused with completed features.

## Implemented after the owner's occasion-picker correction

The owner supplied the concrete occasion-pill screen and rejected more process. Implemented the focused two-step welcome flow: optional prefilled display name/language, then Birthday, Baby shower, Wedding, Christmas, Shopping, Other, Explore and Skip. Preserved the approved fonts, mint colors, stars and simple theme switch. This supersedes the generic task-choice screen proposed below for the current onboarding UI. Basket creation in both owner-confirmed modes remains a separate unfinished feature and is not exposed through a fake destination.

The same occasion picker starts /create. Selection carries the actual enum to the draft form and its URL; changing occasion retains entered details. Profile and completion/defer state persist through authenticated, rate-limited server actions and a service. Default login enters onboarding, completed/deferred users continue to their lists, and explicit login task callbacks are preserved. Get started in desktop/mobile account navigation opens review. Existing users are not globally redirected while browsing or buying. No photo, username, country or role assignment is required.

Additive migration 20261028000100_onboarding_occasions was applied only to the isolated loopback database; no reset/reseed. It adds three RegistryType values and bounded onboarding progress/completion/defer fields to User. Shared public/QR/finder labels handle new occasions. Completion creates no registry and never downgrades on stale submissions. Profile edits do not clear completion; deferred setup can later complete. No payment or publication changes.

Evidence: 200 unit tests, 12 PostgreSQL integration tests, TypeScript and production build pass. Full lint has zero errors and 13 existing warnings. Browser checked profile save, selection into the Christmas builder, changed occasion with retained title, Explore to the directory, Skip to own lists, HT/FR/EN and 320px layout without overflow. Desktop/mobile screenshots are in surrounding outputs. Real Google sign-in was previously verified; no new provider-consent or live payment test is claimed for this gate.

## 1. Feature summary and primary action

Help a first-time family member, gift giver or merchant reach their first useful action after sign-in. The account setup consists of two short steps, followed by the selected task's own setup. Completing account setup is not the same as publishing a list, buying a basket or approving a merchant.

The primary action is to choose what to do first and enter the appropriate working flow. Successful activation means a saved first gift, a found registry, or a submitted merchant application, depending on that choice. A completed profile alone is not activation.

Owner explicitly confirmed both basket modes: creator purchase and sharing for others to select gifts. Keep this requirement through subsequent implementation. The purchase mode remains subject to existing payment/provider/fulfillment gates.

## 2. Research and what it changes

These are observations from primary published documentation and the owner's supplied screenshot, not claims that authenticated competitor flows were tested.

| Reference | Observed evidence | Proposed KadoLakay application |
| --- | --- | --- |
| [Giftster Quick Start](https://www.giftster.com/quick-start-guide/) | Create account, name list, choose privacy, add gift, then share. Only a gift name is required when adding an item. Managing someone else's list is a distinct task. | Keep account setup short. Teach adding and sharing while doing those tasks; separate list owner from recipient. |
| [Giftster welcome](https://www.giftster.com/welcome/) | Separate create-list and group entry points. | Establish intent instead of sending every sign-in to a generic dashboard. Do not add group accounts until that product model exists. |
| [MyRegistry privacy help](https://customercare.myregistry.com/en/support/solutions/articles/48001281831-can-i-create-a-registry-without-sharing-it-) | Private lists and search visibility are explicit settings. | Do not expose a draft or opt a person into public name discovery during onboarding. |
| [Nielsen Norman Group: onboarding and contextual help](https://www.nngroup.com/articles/onboarding-tutorials/) | Up-front tours interrupt work and can be forgotten. Guidance should be dismissible, recallable and relevant to the current task. | Use a short setup, then a persistent task checklist and contextual hints. No compulsory tooltip tour. |
| [GOV.UK question pages](https://design-system.service.gov.uk/patterns/question-pages/) | Ask only questions needed by the service, prefill known answers, group logically, preserve Back and use clear headings. | Prefill Google name; defer delivery address, country and phone until relevant. Do not invent a public username requirement. |
| [W3C multi-page forms](https://www.w3.org/WAI/tutorials/forms/multi-page/) | Logical stages, announced progress and recognizable optional steps. | Two accurately labeled account steps, meaningful focus changes and optional-profile skipping. |
| Owner's Listful screenshot | Centered rounded card, restrained progress indicator, profile fields and a clear Continue action. | Use its focused hierarchy, not its pink palette or mandatory photo/username/country. Full authenticated Listful journey was not inspected; public website fetch was blocked. |

Recommendations below are design decisions derived from those observations. They still need usability validation with real Haitian Creole, French and English speakers.

## 3. Design direction and layout

Retain Fraunces headings, Figtree body, #F0FDFA light canvas, #5EEAD4 actions with dark labels, existing dark mode, and no decorative arrows. No new brand palette, fake reviews, retailer logo parade or generated product artwork.

Use a focused route with a centered card approximately 520px wide on desktop. Keep KadoLakay identity, language and theme controls available; reduce unrelated navigation within this route. A normal page is preferred over an automatic blocking overlay: reload, Back, mobile keyboard and deep-link recovery should remain predictable. On small screens the same flow fills the available width with comfortable side padding and natural scrolling, not a fixed-height modal.

Each step contains one heading, short explanation, related controls, one primary action, and an explicit secondary action. Use generous spacing inside the card, not an oversized empty hero. Native radio controls inside selectable rows provide intent and basket-mode selection. Progress shows Step 1 of 2 / Step 2 of 2, never a fabricated percentage of the whole shopping journey.

Gravity Stars remains part of the app background; no new foreground animation competes with fields. Subtle step transition follows reduced motion and never delays input or navigation. Card/input surfaces remain opaque.

## 4. Exact first-use flow

### Before sign-in

Visitors can browse approved products and open public registry links or QR codes without completing onboarding. Find a registry must remain available without an account. An explicit task such as Create a registry is carried through Google sign-in as a validated same-origin destination.

### Step 1 of 2: Make it yours

- Description: Choose how your name appears and the language you prefer.
- Display name, prefilled from Google if available, editable, trimmed, maximum 100 characters. Explain that a published list can display this name.
- Language: Kreyòl / Français / English, initialized from the active app locale. Changing it preserves the step's entered values.
- No required profile upload, public username, birthday, phone, postal address or country. Existing Google avatar can remain in the account menu; profile imagery is optional work for settings.
- Primary: Continue. Secondary: Set up later. Sign out remains accessible.
- Blank names are permitted when skipping; required entry, if any, belongs to an action that actually needs a visible creator name. Avoid trapping an anonymous-by-preference gift giver.

### Step 2 of 2: What would you like to do first?

| Choice | Helper text | Destination / task |
| --- | --- | --- |
| Create my wishlist | Choose gifts and share your list with people you know. | Guided list creation: occasion, title and optional date; then the editor with Add first gift. |
| Create a basket for someone | Pick gifts for another person and choose how they will be purchased. | Basket setup with recipient display name, optional message and the two modes below. |
| Find a friend's list | Open a shared link or scan a QR code. | Existing finder. No country, photo or other profile requirements. |
| List my business | Apply to display your products on KadoLakay. | Existing merchant application, or the merchant dashboard if an application already exists. Approval remains separate. |

Primary: Continue. Secondary: Explore first. Include Back with previous values retained. An existing trusted task destination is preselected or summarized, not silently discarded. A basket or list task starts a draft only on its own explicit create action, not when a choice is highlighted.

Selecting a task does not permanently classify the user. A person can create lists, give gifts and own a business. Never convert a chosen intent into an admin/business role.

### Basket setup: two modes confirmed by owner

- Buy this basket myself: creator selects gifts and manages the purchase. Local products can be purchased natively only when an eligible provider and commercial workflow are enabled. External gifts are separate store purchases. No claim of unified fulfillment, gift wrapping, delivery or automatic merchant payouts.
- Share this basket: creator curates it so others can choose gifts. Private draft until explicit publication/share. Existing public access rules apply until an unlisted share-token model is implemented; do not label a publicly accessible list as private or recipient-only. Verified paid quantities and temporary holds remain distinct.
- Recipient display name and optional message are collection metadata, not a new recipient account. No automatic emails/invites. Delivery details are collected only in an operationally supported purchase flow.
- The basket's theme picker styles the basket preview, not the app's global theme. Accessible named choices, keyboard selection, live preview and persisted choice. Source reference retailer logos are not evidence of partnership or supported retailer APIs.

### After setup: guidance through actual tasks

For a creator, show a compact checklist: Name your list, Add your first gift, Preview, Share link or QR. Each state is derived from persisted data; viewing or purchasing is not fabricated. Explain store links versus local checkout where gifts are added. The checklist is dismissible and recoverable from Help/Get started. A buyer gets contextual finder/QR help. A merchant sees application status and the next allowed action.

No progress rewards, confetti or compulsory tour after ordinary form submissions. Show a concise confirmation after a successful save and navigate to the task.

## 5. Entry, persistence and recovery rules

- New sign-in with no explicit task: offer onboarding once. New sign-in for an explicit task: offer short setup with Continue to your task / Set up later; preserve that destination. Never force a buyer away from a public list or interrupt a payment return/webhook.
- Returning user: do not replay onboarding on every login. An incomplete setup can be resumed from a discreet dashboard prompt. Existing users are not treated as new solely because the migration adds a nullable field; offer a dismissible invitation.
- Proposed server record: one onboarding state per User, containing version, last saved step, intent, optional basket mode, completedAt and deferredAt. Reuse existing User.name and preferredLocale rather than duplicate them. Do not store raw OAuth profiles, credentials or arbitrary callback URLs in it.
- Save each completed step server-side. Completion is idempotent and atomic with the final preferences. A page refresh resumes the last saved step. Browser Back retains the previous saved answer; leaving with unsaved edits needs a truthful warning or explicit save behavior.
- Validate task destinations against a small internal route allowlist after existing same-origin validation. Reject auth callback/API endpoints and nested onboarding loops. Do not use profile completion as an authorization boundary.
- Actions authenticate on every call, recheck current database identity, use strict Zod input and the existing actor rate limiter, and delegate database work to a service. Never accept userId/role/completedAt or client payment facts as editable input.
- Business/application routes use current database state, not the initial intent. Any failed save keeps entered values and does not advance or claim success. Expired sessions return through login to the same setup/task destination.

## 6. Key states and content requirements

| State | Required behavior |
| --- | --- |
| First use | Useful Google defaults, visible labels, no invented country or forced photo. |
| Existing account | Dismissible invitation; current names/language and real data untouched. |
| Back/reload/language change | Values and valid destination retained; no duplicate list/application. |
| Invalid name/input | Field-specific localized message, focus to error summary/field, no raw exceptions. |
| Saving / double click | Pending label and submission lock; one idempotent completion. |
| Offline / database failure | Keep values, explain retry; no success screen or permanent completion flag. |
| Session expired / deleted user | Sign-in recovery, no saved changes under another account. |
| Concurrent tabs | Monotonic saved progress or explicit version conflict; a stale tab cannot undo completion. |
| Unconfigured checkout | Basket can be curated; honest unavailable payment state, no fake Buy success. |
| Mobile / keyboard / reduced motion | No overflow at 320px; visible focus, usable soft keyboard, no focus trap or required motion. |

Translate headings, helpers, labels, step counters, optional markers, recovery and privacy text in HT/FR/EN before release. Keep names as user content. Do not machine-rewrite Creole names or require legal names. Validate wording with a fluent speaker. Use native language names in the selector.

## 7. Build sequence and pass gates

1. Approve this flow and its data collection. No application redesign has occurred in this research turn.
2. Implement additive onboarding persistence and server services/actions. Rehearse migration on the isolated local database without resetting or reseeding. Tests must cover strict validation, ownership, role tampering, replay/concurrency, deferred/completed distinction and migration behavior for existing users.
3. Implement and verify the two-step UI and safe auth routing. Exercise new/returning accounts, direct callbacks, Back/reload, skip/resume, invalid/long/literal-markup names, network failure and double submit. Keep real Google sign-in working.
4. Integrate real destinations and creator checklist. Basket branch ships with the basket builder, never as a dead choice or placeholder redirect. Existing create/find/merchant flows remain usable while the basket branch is developed.
5. Browser checks in all three languages, light/dark, 320px/390px/desktop, keyboard/focus, zoom, reduced motion, and QR/private-list regression. Run unit tests, isolated PostgreSQL integration tests, TypeScript, lint and production build. No gate is passed by a screenshot alone.

## 8. Validation and measurement

Validate with a registry creator, a gift giver opening a QR, and a merchant applying on a phone; include native Creole speakers and constrained-network use. Measure time and abandonment to the first relevant action, repeated-field requests, failed saves and successful resume. Start with local/test evidence. Do not add a tracking vendor or log names, emails, recipient messages, store URLs, tokens or private list identifiers as analytics payloads.

Useful implementation references: Impeccable interaction-design.md for control states/focus and spatial-design.md for card rhythm; W3C form instructions, validation and multi-page patterns. Brand rules remain in .impeccable.md.

## 9. Open items that do not block onboarding design

- Creator-purchase live checkout still needs the existing entity/provider, inventory, delivery, refund and settlement decisions.
- Username-based profile discovery, avatars uploaded to storage, country-based recommendations and public name search are separate features, not implied by the inspiration screenshot.
- Owner review of the proposed two-step flow is pending. Research documentation and code inspection are completed; no new runtime tests are claimed for this documentation-only gate.
