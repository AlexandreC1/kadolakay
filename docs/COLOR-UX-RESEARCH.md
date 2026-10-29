# KadoLakay color and UX refinement

Researched October 27, 2026. Owner still rejects the current implementation as bland. This is a researched design specification, not visual approval or a claim that these revisions are already implemented.

## Diagnosis

The current page's large pale canvas, muted body text, isolated basket and repeated horizontal sections give too much content the same visual weight. Tight headline tracking and small supporting labels also make the composition feel more like a software landing page than an inviting family registry. Changing global hex values alone has not solved this.

These are design judgments based on the current implementation and owner's feedback, not usability-test findings. Research supports the principles below, not a universal winning palette for Haitian audiences.

## Evidence translated into decisions

| Source | Finding | KadoLakay application |
| --- | --- | --- |
| [NN/g visual hierarchy](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/) | Relative scale, grouping, value and saturation direct attention | One clear hero focal point; distinctly smaller supporting copy; content sections with different visual weights |
| [NN/g color use](https://www.nngroup.com/articles/color-enhance-design/) | Consistent color roles support comprehension | Ocean for identity/navigation, coral for primary action, neutrals for commerce information; independent labeled error/success states |
| [Baymard homepage research](https://baymard.com/homepage-and-category-usability/benchmark/page-types/homepage) | Navigation, search and curated paths need clear entry points | Keep Create and Find distinct; show real merchant/product routes rather than decorative category controls |
| [Babylist](https://www.babylist.com/) | Registry creation and finding have separate navigation entries | Preserve both user jobs as first-class actions; do not merge them behind the basket |
| [Haiti Design Co maker teams](https://haitidesignco.org/pages/our-teams) | Named makers and actual materials establish specificity | Merchant-authored facts and authorized photos carry identity; avoid invented cultural symbolism and borrowed product photos |
| [WCAG contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) | Normal text requires 4.5:1; large text 3:1 | Measure each foreground/background/state pair, including translated labels, hover and focus |

## Proposed color roles within approved Lakou direction

| Role | Color | Intended application |
| --- | --- | --- |
| Ink | #122E38 | Reading text and bright-coral button labels |
| Strong ocean | #075E78 | Focused scene area and navigation emphasis |
| Bright coral | #F46B50 | Main action with ink text; small deliberate accents |
| Deep coral | #C5452F | Alternative small action with light text; keep separate from error semantics |
| Paper | #F8FAF8 | Product facts, forms and long reading surfaces |
| Sand | #EFE7D6 | Limited material warmth, not a full-page beige wash |
| Muted ink | #4D6269 | Secondary text on paper |

Calculated using WCAG sRGB relative luminance: ink/paper 13.59:1; paper/ocean 6.95:1; ink/bright coral 4.79:1; paper/deep coral 4.69:1; muted ink/paper 6.13:1. Paper/bright coral is only 2.83:1 and must not be used for normal button text. These are exact flat-color pairs, not certification of a rendered page or transparency/gradient combinations. Production tokens should use the project's OKLCH convention after conversion.

Do not recolor every button globally. Transactional secondary actions should retain a quieter hierarchy. Do not introduce gold, purple or teal accents simply to add variety.

## Composition specification

1. Keep Lakou family registry first. Create is the primary action; Find is clearly visible beside it. The headline must communicate registry purpose without relying solely on a slogan.
2. Replace the floating isolated-object presentation with an intentionally framed ocean scene area. Keep object edges and basket material readable against it. No background blobs, fake caustics, ornamental statistics or downloaded imagery. Compare a bounded scene field against a full-width color treatment before choosing; do not color the entire page.
3. Relax headline tracking from the current -0.065em. Test about -0.035em with real Creole and French strings. Use a tighter, deliberate heading/body scale rather than making every title oversized. Do not add another font download just to appear distinctive.
4. Bring the finder closer to the hero's action flow. It should read as a giver's practical route, not an unrelated promotional stripe. Preserve exact shared-address lookup and privacy rules; no invented name search.
5. Replace uniform section rhythm with a compact merchant introduction, a stronger product area and a quieter occasion section. Scale grid columns to actual content count. One merchant should not look like two missing cards.
6. Product cards need authorized product photography to become visually rich. Until available, maintain honest text presentation and development labels. Never fill missing photos with AI scenes or unrelated craft products.
7. Preserve direct basket drag and keyboard controls. Scroll motion should connect sections and settle promptly. No added autoplay rotation, scroll hijacking, confetti or animation on checkout.

## Verification gates for the next implementation pass

- Review desktop and 320/390px mobile side by side in HT/FR/EN; no clipped heading, overflowing controls or unbalanced empty columns.
- Check primary action recognition, registry finder discoverability and merchant/product entry routes. A visual judgment is not a substitute for observed user testing.
- Measure rendered text contrast in normal, hover, focus, disabled and error states. Do not use color alone for statuses.
- Test direct drag, keyboard access, normal touch scrolling, reduced motion, failed WebGL and no-JS content. Existing static fallback must remain useful.
- Keep scene code lazy and rendering idle/offscreen. Measure mobile frame time before any 60 FPS claim.
- Preserve approved merchant filtering, private-registry protection, server price/availability checks and disabled checkout configuration.

No application palette was silently replaced during this research pass. Next work is a coherent composition revision using these roles, with actual browser evidence. Owner approval is still pending. Hosting/payment/content blockers remain recorded in HANDOFF.md.
