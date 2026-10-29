# KadoLakay design direction review

Status: owner selected A / Lakou with B / Atelye product detail on October 27, 2026. Final asset, typography and interaction refinements still require visual verification.

The review artifact is `docs/design-review.html` in this repository and `outputs/KadoLakay-design-review.html` in the parent workspace. It is self-contained HTML/CSS/SVG with no network dependencies or generated bitmap imagery. It presents desktop and mobile homepage compositions, merchant/product detail, public registry availability states, checkout hierarchy, and a three-step motion storyboard for each direction. All business names, prices, progress and products are illustrative and labeled as sample content. The original SVG studies are planning artwork, not finished 3D assets or actual merchant inventory.

## Options

- **A / Lakou:** family registry first, local merchant discovery immediately below the hero, researched woven-basket material study as one optional dimensional scene. Recommended for the combined registry and marketplace MVP, with B's attention to product details.
- **B / Atelye:** product and maker first, dark material-focused hero, larger object presentation, compact transactional layout. Requires strong authorized merchant imagery; only an eligible product gets an optional 3D viewer.
- **C / Lakay:** home and occasions first, centered architectural composition, grouped registry content and a small abstract domestic scene. Highest scene art-direction effort and greatest risk of decorative content obscuring commerce.

Shared palette: ocean blue, sunlit sand, restrained coral. Soft controls, distinct compositions, clear price and availability, no emoji, AI-generated images, invented ratings or delivery/payout guarantees. Proposed display type must be reviewed with real English, French and Haitian Creole strings; the standalone boards use installed fonts so they remain fully offline.

## Evidence and cultural research

- [Palm-leaf basket product reference](https://rosiesboutiquehaiti.com/products/small-oval-sorting-basket): a material/construction starting point; does not imply one basket represents all Haitian craft.
- [Haiti Design Co recycled steel art](https://haitidesignco.org/pages/recycled-steel-art): material and maker process reference. Existing artist motifs may not be traced or repurposed without authorization.
- [FOKAL heritage program](https://fokal.org/index.php/en/2016/01/20/heritage-2/): architectural light, screens and veranda rhythm research. The abstract room SVG does not reproduce or claim to be a specific historic house.
- [Deux Mains story](https://deuxmains.com/pages/our-story-2): reference for practical maker and product identity, not a source of licensed production images.

## Review and selection gate

1. User selects A, B, C, or specific combinations by screen.
2. Resolve requested tweaks to composition, type, color proportions, control shapes, product density and motion.
3. Confirm one coherent revised direction across homepage, merchant/product, registry and checkout.
4. Build a measured motion proof with a static fallback before full UI implementation. Do not promise Three.js/R3F/Drei plus realtime caustics within the original 150kB gzipped scene-overhead constraint without measurement and an explicit tradeoff decision.
5. Implement using actual merchant inventory and authorized photography. Keep empty, loading, pending approval, suspended merchant, unavailable product, expired reservation, payment pending and failure states explicit.

## Constraints and business rules

The first-year infrastructure ceiling is $50 total. No paid Spline subscription, commissioned model library or purchased font is assumed. Original code-native assets or authorized merchant material are required.

3D is limited to one lazy decorative/inspection scene. Static HTML actions, product information and checkout remain functional without it. Reduced motion, failed WebGL, constrained networks or poor frame time receive a composed static fallback. Stop rendering offscreen. No motion hijacks page scrolling.

Approval status is an operational state, not a quality certification. Public product visibility requires an approved, non-suspended merchant and an available product. Availability and price are revalidated server-side. A provider redirect is never proof of payment. Any delivery, pickup, fees, refund and vendor settlement terms must be resolved and shown before a live purchase flow is approved.

The board's checkout copy is illustrative; it does not authorize launch or assert that the provider account, currency eligibility, tax/fee policy or fulfillment operation is configured. No production app files or global design context were changed to create this review.
