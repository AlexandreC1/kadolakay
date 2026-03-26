# CI/CD Guide — KadoLakay

## What is CI/CD and why should you care?

Imagine you're building a house. CI/CD is like having an inspector check every brick before it goes into the wall, and a crew that automatically installs approved bricks.

- **CI (Continuous Integration)**: Every time you change code, automated checks verify it won't break anything. Think of it as spell-check for your codebase.
- **CD (Continuous Deployment)**: Once code passes all checks, it's automatically deployed to your server. No manual SSH, no "it works on my machine."

Without CI/CD, deploying looks like this:
```
1. Write code
2. Forget to run tests
3. Push to production
4. Get a call at 2am that the site is down
5. Panic
```

With CI/CD:
```
1. Write code
2. Push to a branch
3. Open a Pull Request
4. CI automatically runs lint + typecheck + build
5. If anything fails → PR is blocked, you fix it
6. If everything passes → merge → auto-deploy
7. Sleep peacefully
```

---

## Our Pipeline Architecture

```
Developer pushes code
        │
        ▼
   ┌─────────────────────────────────┐
   │     GitHub Pull Request          │
   │                                  │
   │  ┌─────────┐   ┌─────────────┐  │
   │  │  Lint    │   │ TypeCheck   │  │   ← Run in PARALLEL
   │  └────┬────┘   └──────┬──────┘  │
   │       │               │         │
   │       └──────┬────────┘         │
   │              ▼                  │
   │       ┌──────────┐             │
   │       │  Build   │             │   ← Only if lint + typecheck pass
   │       └──────────┘             │
   │                                  │
   │  All green? ✅ → Ready to merge  │
   │  Something red? ❌ → Blocked     │
   └─────────────────────────────────┘
        │
        ▼ (merge to main)
   ┌──────────────────┐
   │  Deploy to       │
   │  Production      │
   │  (Vercel)        │
   └──────────────────┘
```

---

## The Three Workflows

### 1. `ci.yml` — The Gatekeeper

**When**: Every push and every PR to `main`

**What it does**:

| Job | Purpose | Speed |
|-----|---------|-------|
| `lint` | Catches code style issues, unused imports | ~30s |
| `typecheck` | Verifies TypeScript types are correct | ~45s |
| `build` | Compiles the entire app (the real test) | ~60s |

**Why three separate jobs?** If typecheck fails but lint passes, you immediately know the problem is a type error, not a style issue. Debugging is faster.

### 2. `deploy.yml` — The Delivery Truck

**When**: After merge to `main`, or manually triggered

**What it does**: Deploys the app to Vercel (staging or production)

**Key concepts**:
- **Concurrency**: If you merge twice quickly, the first deploy is cancelled
- **Environments**: GitHub can require approval before production deploys
- **Artifacts**: The CI build output is saved so we don't rebuild for deployment

### 3. `db-migrate.yml` — The Careful Surgeon

**When**: Migration files change on `main`

**What it does**: Runs Prisma migrations against the production database

**Why separate?** Database changes are the riskiest part of deployment:
- A bad migration can delete data permanently
- Migrations must run BEFORE new code deploys
- We want explicit human approval via GitHub environment protection

---

## Branch Protection: The Safety Net

Branch protection rules prevent anyone (including you) from pushing directly to `main`. Every change must go through a PR.

### Setting it up on GitHub:

1. Go to **Settings → Branches → Add rule**
2. Branch name pattern: `main`
3. Enable these protections:

| Setting | What it does |
|---------|-------------|
| ✅ Require a pull request | No direct pushes to main |
| ✅ Require status checks | PR can't merge if CI fails |
| ✅ Require branches to be up to date | PR must include latest main |
| ✅ Required checks: `Lint`, `Type Check`, `Build` | All three must pass |

**After this**: Even if you try `git push origin main`, GitHub will reject it. You MUST create a branch, open a PR, wait for CI, then merge.

---

## How to Work With This Setup

### Daily workflow:

```bash
# 1. Create a feature branch
git checkout -b feat/add-search

# 2. Make your changes
# ... edit files ...

# 3. Commit
git add -A
git commit -m "feat: add registry search"

# 4. Push and create PR
git push -u origin feat/add-search
gh pr create --title "Add registry search" --body "..."

# 5. Wait for CI ✅
# GitHub runs lint → typecheck → build automatically

# 6. If CI fails:
# - Read the error in the Actions tab
# - Fix it locally
# - Push again (CI re-runs automatically)

# 7. If CI passes:
# - Merge the PR (via GitHub UI or `gh pr merge`)
# - Deploy happens automatically
```

### When CI fails:

1. Click the red ❌ on your PR
2. Click the failed job name (e.g., "Type Check")
3. Read the error output
4. The error tells you EXACTLY what's wrong:
   - **Lint fails**: ESLint found issues → run `npm run lint` locally to see them
   - **TypeCheck fails**: Type error → run `npx tsc --noEmit` locally
   - **Build fails**: Compilation error → run `npm run build` locally

---

## Environment Secrets

These secrets must be configured in **GitHub Settings → Secrets and variables → Actions**:

| Secret | Purpose | Where to get it |
|--------|---------|----------------|
| `DATABASE_URL` | Production database connection | Neon dashboard |
| `VERCEL_TOKEN` | Vercel deployment auth | vercel.com/account/tokens |
| `VERCEL_ORG_ID` | Vercel organization ID | `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Vercel project ID | `.vercel/project.json` |

**NEVER** commit secrets to code. Not even in `.env`. GitHub Secrets are encrypted and only exposed during workflow runs.

---

## Vercel Integration (The Easy Path)

Instead of the `deploy.yml` workflow, you can use Vercel's built-in GitHub integration:

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Vercel automatically:
   - Deploys on every push to `main` (production)
   - Creates preview deployments for every PR
   - Shows deploy status on your PRs

This is **recommended for getting started**. The `deploy.yml` workflow gives you more control later when you need it.

---

## Common Questions

**Q: Can I skip CI for a quick fix?**
A: No. And that's the point. The "quick fix" that skips testing is how production breaks happen. CI runs in ~2 minutes. Be patient.

**Q: What if CI passes but the app is still broken?**
A: CI catches compilation and type errors, not logic bugs. For that, you need tests (coming in Phase 3 of the roadmap) and manual QA.

**Q: How much does this cost?**
A: GitHub Actions gives you 2,000 free minutes/month for private repos, unlimited for public repos. Our pipeline uses ~3 minutes per run. That's ~600 runs/month for free.

**Q: Can I run CI locally before pushing?**
A: Yes! Run these commands:
```bash
npm run lint        # Same as CI lint job
npx tsc --noEmit    # Same as CI typecheck job
npm run build       # Same as CI build job
```
