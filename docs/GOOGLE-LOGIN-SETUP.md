# Activate Google login locally

No live Google credentials are included in this repository. Google, Microsoft, GitHub and email sign-in are supported by the existing Auth.js integration. Each requires its own real provider configuration. First-time successful OAuth sign-in creates the account in PostgreSQL. Returning sign-in uses the linked account. Matching email alone does not silently link another provider.

1. Open https://console.cloud.google.com/auth/overview in your own browser and select or create the KadoLakay project.
2. Complete Branding with KadoLakay and your support/contact email.
3. Choose External audience. While testing, add your own Google email under test users.
4. Create a client under Clients with application type Web application.
5. Authorized JavaScript origin: `http://localhost:3000`.
6. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`. No locale prefix, no trailing slash, use localhost consistently rather than127.0.0.1.
7. In your own terminal, from this repository run `npm run auth:setup`. Paste client ID and secret into the local prompts. Secret input is hidden. The tool writes only the relevant keys to Git-ignored `.env.local`, preserves existing settings and does not print credentials. Do not paste credentials into chat, screenshots or source files.
8. Restart the development server with `npm run dev`. Open http://localhost:3000/login. Google is enabled automatically when database, Auth secret and OAuth client are configured. Email and other SSO options require separate configuration and are not activated by Google setup.
9. Choose Google, sign in with your test user, return to dashboard, then sign out. Repeat sign-in and verify account/registry ownership remains the same. Try cancelling sign-in, returning to a registry edit callback, and an external callback URL. No live completion is claimed until this succeeds.

If Google reports redirect_uri_mismatch, compare the client redirect URI character for character. If access is blocked while the application is in testing, verify the test-user email. If account-not-linked appears, use the original sign-in method. Never enable automatic account linking merely to suppress this error.

Before hosting, register the exact HTTPS production callback on a suitable client, configure credentials in the host's protected environment, set the canonical app origin, and complete Google's audience/publication requirements. Local test-user success is not production approval. No Google API access beyond basic sign-in identity is needed.

Sources: https://authjs.dev/getting-started/providers/google and https://developers.google.com/identity/protocols/oauth2/web-server#creatingcred

Local verification completed October28: Google login and repeat login now succeed with the owner test account. Session survives reload; sign-out and protected-dashboard redirect checked. Existing secrets in Google client settings are masked and cannot be recovered by copying that row. Copy a new full secret from its creation dialog before closing it. Google allows only two secrets; handle any rotation deliberately. The local setup tool rejects masked values and repeated secret pastes. Do not type or paste twice simply because the hidden prompt shows no characters.
