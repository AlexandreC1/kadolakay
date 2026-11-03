# November 3 login and presentation handoff

Port 3000 runs this Claude design checkout. Google was registered with undefined credentials because this checkout lacked the owner's existing Google configuration. Reused only AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET from the original ignored local configuration into this checkout's ignored .env.local. Did not change database URL, session secret, roles, schema or migrations. Never commit those environment files.

Added strict provider configuration detection and disabled registration of incomplete Google/Resend providers. Added explicit PKCE/state and verified Google email checks. Localized configuration/failure feedback, accessible email label, duplicate-submit guard, locale-aware return path and honest email-send status. No dangerous automatic account linking. Email is unavailable until a sender/API key is provisioned. Google sign-in was actually completed through the account chooser and callback to /fr/dashboard. Existing signed-in session survived the build/restart. Google Cloud still has the KadoLakay consent branding; external launch checklist records the required Bayou rename and separate production client/project.

Presentation: Bayou/mint/Figtree/Fraunces/Gravity Stars preserved. Full hero heading now one solid text color. Removed decorative CTA arrows, gradient rule, phone gradient and blue glows. Clearly label fictional registry example and payment availability, remove unsupported four-payment claim. No live payment activation.

Verification: 208 tests/37 files pass; typecheck/lint pass; production build passed after auth changes. Final copy/style-only changes typechecked again. Browser screenshot outputs/Bayou-google-login-verified.png in the main workspace. See EXTERNAL-SERVICES-AND-LAUNCH.md for remaining security/business/provider/legal gates. The Prisma 7 release branch's MFA/device/encryption tests do not cover this Prisma 6 design lineage; integration and full release verification remain required.

## Two implemented gift features

Continue with docs/TWO-GIFT-FEATURES.md. Branch codex/two-gift-features adds the dedicated trilingual budget/occasion finder and transactional multi-select registry addition. It preserves the restored identity/login and does not alter schema or activate payments. The active Claude checkout received only these guarded feature-file updates. The 219-unit/real-PostgreSQL/browser/type/lint/build evidence and temporary-fixture cleanup are documented there.
