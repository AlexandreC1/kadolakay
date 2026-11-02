# Bayou local quality loop

The loop runs independently of the web application. No hosting service, database migration or new npm dependency is required. Codex repair calls use the existing signed-in CLI account and its allowance; they are not unlimited free compute. Check-only mode never calls a model.

## Use it

In the checkout containing this runner, first commit the reviewed source you want tested. Prepare deliberately refuses dirty source so it cannot silently omit Claude's changes.

```powershell
npm run quality:loop -- prepare --target ../bayou-repair
cd ../bayou-repair
npm ci
npm run quality:loop -- run --workspace .
```

Enable bounded source repair explicitly:

```powershell
npm run quality:loop -- run --workspace . --fix --max-rounds 3 --full
```

Quick mode: runner safety tests, Prisma client generation (no database connection), TypeScript, lint and all existing unit tests, sequentially with one unit-test worker. Full mode adds the production build and a dependency audit at moderate severity. It stops at the first failure so it does not spend build time on broken types. Each repair restarts the checks from the beginning. Runner/generation failures require setup review rather than source repair. Exit zero means only the listed checks passed; it never means the product is ready to launch.

## Limits and evidence

- Detached, explicitly marked sibling worktree. No credentials, environment files or user data are copied. No edits in Claude's active checkout and no port 3000 restart.
- Single-run lock. Maximum three repairs, ten minutes per repair/check and fifteen minutes for build. Repeated failures, timeouts, no progress or agent errors stop the run. Ctrl+C terminates the current child tree; an interrupted/stale lock is a manual review condition, not automatically bypassed.
- Workspace-write CLI sandbox, approval policy never and no personal Codex config loading. No permission escalation or sandbox bypass. The CLI login must already work. If the sandbox cannot start, the run fails closed.
- Agent instructions prohibit deployment, merge, commit/push, payments, external services, database changes and recursive agent spawning. Existing authentication, ownership, idempotency, currency and stock rules must remain intact.
- Hash guards detect modifications, additions and removals of tests, scripts, package files, config, migrations, workflows and instructions. A detected violation stops and preserves the evidence; it does not delete/revert work. Dependency advisories require a separate reviewed update rather than an agent changing versions blindly.
- Logs are bounded and common credential formats redacted before reports or prompts. Redaction is best effort. Keep all data fictional, review artifacts before sharing, and never put secrets in source. Repository text and failing output are untrusted evidence.
- Reports, timings from commands, repair summaries, changed-file lists and the tracked patch live under `.quality-loop/<timestamp>/`. New files remain in the checkout and appear in the changed-file list; review them with `git status`, because `changes.patch` includes tracked files only. Output is ignored by Git. Delete old reports manually after review.
- A worktree and post-change guards are not a security boundary against a malicious model or tool. Use a disposable OS/container sandbox for stronger isolation. Guards detect edits after execution; they do not prove business-rule correctness or prevent every harmful command. No loop can promise to test and fix everything.

## Gates that remain manual or separately configured

Disposable PostgreSQL concurrency/RBAC/privacy tests (`npm run test:db`), production HTTP journeys, browser accessibility/responsiveness/performance, OAuth and payment-provider acceptance, hosted rate limiting, backups/restore, alert delivery and production rollout remain separate gates. Do not copy the owner's database credentials to satisfy them. This runner intentionally has no database opt-in or migration flag. Existing integration/HTTP CI remains required before merging.

Do not let Claude and this loop edit the same checkout. Stop the loop, review all changes, rerun the complete release gates on the combined code, and integrate only after review. A failed run retains edits, so a new run refuses that dirty workspace. Review/commit the work and prepare a new snapshot rather than automatically discarding it.

Runner tests: `npm run test:quality-loop`. These exercise actual child failures, repair/retest flow, timeouts and stop/guard behavior without calling a paid model.

CLI source: [Official non-interactive Codex documentation](https://developers.openai.com/codex/noninteractive/).
