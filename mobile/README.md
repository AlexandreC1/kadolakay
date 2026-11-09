# Bayou mobile app

Expo (React Native) app for Android and iOS, built from the same product and design decisions as the web app in the repository root. It currently runs on **demo data**: fictional lists and shops based on `prisma/seed.ts`. No account or payment is real until the mobile API exists.

## Run it

```bash
cd mobile
npm install
npx expo start          # scan the QR code with Expo Go, or press a / i for an emulator
npx expo start --web    # the same app in a browser
```

Set `EXPO_PUBLIC_WEB_URL` to the web app's public address so shared list links and QR codes point there. Until the owner picks a domain, links use the reserved `https://bayou.example`, so an unset value is obvious.

## Checks

```bash
npm run typecheck   # tsc
npm run lint        # expo lint
npm test            # vitest: store rules, copy completeness, money format
npm run web:export  # production web build in dist/
```

## How it is put together

- `src/app/`: screens (Expo Router). Tabs: Home, Lists, New list (opens the create flow), Gifts, Account. Stacks for a list (`r/[slug]`), gift, shop, purchases and the shop owner's screens (`business/`). The offer, share and pick-a-list screens are native form sheets.
- `src/data/store.ts`: every change the app can make, as a pure reducer with the web app's rules: up to 20 catalog gifts per save (all or nothing), only approved shop products can be paid in the app, a gift is never given beyond what is needed, a given gift stays on its list, orders move one step at a time, only owners change their lists and shops. Covered by `store.test.ts`.
- `src/copy/`: text in Kreyòl, French and English. Home, list, guest, tab and occasion text is imported directly from the web app's `src/lib/*-copy.ts` (through the `@web/*` alias and Metro `watchFolders`), so both apps say the same thing. Mobile-only text is in `app.ts`, where French and Creole are type-checked against English.
- `src/theme/tokens.ts`: colours from `src/app/theme.css` (mint `#5EEAD4`, evergreen ink, light-mode evergreen actions for contrast, mint actions in dark mode), Figtree and Fraunces, spacing, radius and motion.
- `src/ui/`: shared pieces. `WovenProgress` is the web's woven band redrawn in SVG; `GiftArt` is the photo-less gift tile; `Screen` gives every screen a large title that hands over to a compact translucent bar.

Only dependency-free modules from `src/lib` may be imported. Anything that touches Prisma, Next or Node APIs stays on the server.

## Moving off demo data

1. Add a mobile API to the Next.js app (JSON route handlers with bearer-token sessions; server actions cannot be called from a native app). Reuse the existing services, authorization and validators.
2. Replace each reducer action with a request and apply the server's answer. The screens already read through selectors in `store.ts`.
3. Email-link and Google sign-in on the device (deep link `bayou://`), then remove the demo sign-in buttons.
4. Checkout stays off until the operator decision in `docs/DECISIONS.md`; the offer sheet already shows only shop gifts with stock left.

## Store builds

Use EAS (`npx eas-cli@latest build`). Google Play has a one-time $25 developer fee; the Apple Developer Program is $99 a year, which is above the project's $50 first-year ceiling, so iOS publishing needs an explicit owner decision. Bundle id and package are set to `app.bayou.mobile` in `app.json` as a placeholder until the owner confirms them.
