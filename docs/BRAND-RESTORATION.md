# Approved Bayou branding restored

Owner instruction, November 2, 2026: restore the project name, animation, colors and fonts. This supersedes the navy/gold Nuit experiment.

- Display/package name: Bayou. Existing database identifiers, OAuth settings, verified email addresses and storage keys stay compatible.
- Light background: HSL166.2 76.5%96.7% (#F0FDFA); primary action: HSL170.6 76.9%64.3% (#5EEAD4); evergreen ink. Dark mode remains evergreen with mint actions.
- Figtree body/UI and Fraunces headings, self-hosted through next/font.
- Restore the approved Gravity Stars canvas. It renders locally, runs a bounded four-second introduction, respects reduced motion and hidden tabs, and has no play button or remote visual assets.
- Keep the compact light/dark switch, not the three-button theme picker.

Restoration changes presentation only. The pre-existing AGENTS.md and src/proxy.ts edits were not reverted. No schema migration, credential copy, role change or payment activation is part of this task.

The approved Latin variable WOFF2 files are bundled under src/app/fonts with their SIL Open Font licenses. next/font/local removes Google download retries from development/builds while keeping the exact approved typefaces.
