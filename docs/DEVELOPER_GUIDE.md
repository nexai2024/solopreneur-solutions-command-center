# Solopreneur OS — Developer Guide

A practical guide for junior–mid developers joining this codebase. Everything below is based on the repository as it exists today. Items that could not be fully verified from code are marked `<uncertain>`.

---

## 1. Overview

**Solopreneur OS** (package name: `solopreneur-command-center`) is a Next.js App Router app that helps a solo founder move from **idea → project → build → leads → growth → revenue** in one product.

### High-level architecture

| Layer | Location | Responsibility |
|--------|----------|----------------|
| UI (RSC + client) | `src/app/**`, `src/components/**` | Pages load data; workspaces are mostly `"use client"` |
| Server Actions | `src/lib/actions/*.ts` | Authenticated CRUD and AI workflows (`"use server"`) |
| Domain / AI | `src/lib/ai/**`, `src/lib/leads/**`, `src/lib/growth/**` | LLM prompts, Reddit/HN fetch, playbooks |
| Integrations | `src/lib/github/**`, `vercel/**`, `stripe/**` | External APIs + webhook processors |
| Data | `prisma/schema.prisma` → `generated/prisma` | PostgreSQL (`app` schema) via Prisma 7 |
| Auth | Clerk + `src/lib/auth.ts` | Session → Prisma `User` |

**Core idea:** The `Project` model is the hub. Promoting an idea or lead creates/links a project and can seed tasks and milestones. Growth, builds, SEO, and brand voice hang off that project.

**Request path (typical):** Browser → Server Action → `requireAuth()` → ownership check → Prisma / OpenAI / external HTTP → `revalidatePath(...)` → UI updates.

---

## 2. Component breakdown

### Dashboard shell
- **Where:** `src/app/dashboard/layout.tsx`
- **Purpose:** Sidebar nav to Overview, Brainstorm, Build Tracker, Lead Finder, Growth Engine, Revenue, Repository, Settings.
- **Connects to:** Clerk `UserButton`; all feature pages under `/dashboard/*`.

### Brainstorm & Ideas
- **Where:** `src/app/dashboard/brainstorm`, `src/lib/actions/brainstorm.ts`, `ideas.ts`, `src/lib/idea-scorer.ts`, `src/lib/ai/brainstorm-ai.ts`
- **Purpose:** Capture ideas/nodes, score them (including AI), promote into a project.
- **Connects to:** `promoteToProjectBundle` → Build Tracker / Growth revalidation.

### Build Tracker
- **Where:** `src/components/build-tracker/*`, `src/lib/actions/tasks.ts`, `build-library.ts`
- **Purpose:** Per-project tasks (kanban + detail sheet), milestones, build pipeline, GitHub/Vercel/profile tabs.
- **Internally:** Client state for boards; mutations go through server actions. Drag-and-drop uses `@dnd-kit`.
- **Connects to:** Growth via **Launch Mode** (`/dashboard/growth-engine?projectId=…&launch=1&…`) when a build is `success` / `approved` / `released`.

### Lead Finder
- **Where:** `src/components/lead-finder/*`, `src/lib/actions/leads.ts`, `src/lib/ai/lead-finder.ts`, `src/lib/leads/sources/*`
- **Purpose:** Niche search → discover communities → fetch Reddit/HN posts → AI relevance → save `Lead` with rich `metadata`. Draft reply + “Copy & mark contacted”.
- **Connects to:** Project brand voice (for replies); `promoteLeadToProject`.

### Growth Engine
- **Where:** `src/components/growth-engine/*`, `src/lib/actions/growth.ts`, `src/lib/ai/growth-coach.ts`
- **Purpose:** Weekly Growth Coach, brand voice, content calendar (schedule/fan-out/hashtags/A/B), launch playbooks, campaigns, SEO keywords.
- **Connects to:** `ContentItem`, `GrowthWeeklyPlan`, `LaunchPlaybookProgress`, `MarketingCampaign`, Build Tracker Launch Mode.

### Revenue
- **Where:** `src/components/revenue/*`, `src/lib/actions/revenue.ts`, Stripe webhook routes
- **Purpose:** Surface subscriptions/transactions/MRR; sync from Stripe when webhooks are configured.

### Repository & VCS
- **Where:** `src/app/dashboard/repository`, `src/lib/github/*`, `src/lib/actions/repo-monitoring.ts`
- **Purpose:** Link repos, monitor CI/activity, feed build library via webhooks/sync.

### Settings / ops
- **Where:** Settings workspace, `src/lib/actions/gdpr.ts`, `src/app/api/health`, production readiness panel
- **Purpose:** Account/GDPR, health checks, readiness signals.

### Orphan / partial libraries
- **Where:** `src/lib/marketing/*`, many `src/lib/ai/marketing/*`, `src/lib/social/*`
- **Note:** Designed marketing/social pieces exist; Growth Phase 1 wires *some* AI helpers. Full social publish and newsletter send are **not** fully productized in the UI.

---

## 3. Data flow

### Promote (spine)
```
Idea | Brainstorm node | Lead | Manual
  → promoteToProjectBundle()
  → create/link Project (+ optional starter tasks/milestones)
  → revalidatePath: dashboard, brainstorm, build-tracker, growth, leads, repository
```

### Lead mining
```
niche
  → searchLeadsWithAI (AI rate limit + plan limit)
  → discoverCommunities (OpenAI JSON)
  → Reddit / HN HTTP fetch
  → scoreRelevantPosts (OpenAI JSON)
  → Lead rows (contactName = author; metadata = post/intent/approach)
  → draftLeadReply → metadata.draft_reply
  → markLeadContactedFromCopy → status=contacted + outreach timestamps
```

### Task board
```
getProjectsWithTasks → toBoardTask()
  → TaskKanbanBoard local state
  → createTask / updateTask / reorderTasks / deleteTask
  → revalidatePath build-tracker + dashboard
```

### External ingress
| Source | Route | Effect |
|--------|-------|--------|
| Clerk | `api/clerk/webhook` | User lifecycle |
| Stripe | `api/stripe/webhook` | Billing sync (+ idempotency table) |
| GitHub / CI | `api/github/webhook`, `api/ci/webhook` | Repo/build updates |

---

## 4. Dependencies (roles)

| Dependency | Role |
|------------|------|
| Next.js 16 + React 19 | App Router, RSC, Server Actions |
| Clerk | Auth UI + server session |
| Prisma 7 + `pg` adapter | Typed DB access to Postgres |
| OpenAI SDK | Structured JSON completions |
| Stripe | Billing / webhooks |
| Octokit | GitHub API |
| `@dnd-kit/*` | Kanban DnD |
| Zod / React Hook Form | Form validation patterns |
| Vitest | Unit tests |
| Tailwind + Radix/shadcn-style UI | Components |
| TipTap (dependency) | `<uncertain>` Full in-app editor UX not confirmed complete; blog AI returns TipTap-shaped JSON |

**Env (by usage):** `DATABASE_URL`, `DIRECT_URL`, Clerk keys, `OPENAI_API_KEY`, `ENCRYPTION_KEY` (64 hex), Stripe secrets, optional Reddit OAuth (`REDDIT_CLIENT_ID` / `SECRET`), `AI_RATE_LIMIT_PER_HOUR`.

---

## 5. Key functions

### `getCurrentUser(): Promise<DbUser | null>`
- **File:** `src/lib/auth.ts`
- **Params:** none (reads Clerk session)
- **Returns:** Prisma user fields, or `null` if unauthenticated / error
- **Side effects:** May create user or link `clerkId` to existing email row. Errors are swallowed → `null`.

### `requireAuth(): Promise<DbUser>`
- **Params:** none
- **Returns:** `DbUser`
- **Side effects:** Throws `"Unauthorized"` if no user. Used at the top of almost every action.

### `promoteToProjectBundle(source): Promise<PromoteResult>`
- **File:** `src/lib/actions/promote.ts`
- **Params:** Discriminated union: `{ type: "idea", ideaId }` \| brainstorm node \| lead \| manual fields
- **Returns:** `{ project, ideaId, tasksCreated, milestonesCreated }`
- **Side effects:** Inserts/updates project & related rows; may call starter task/milestone generators; revalidates many dashboard paths. Idempotent-ish if idea already promoted with a live project.

### `searchLeadsWithAI(niche: string): Promise<LeadDTO[]>`
- **Side effects:** Rate limit + plan limit; creates up to `MAX_AI_LEADS` (20) lead rows; revalidates lead-finder/dashboard. Multiple LLM + HTTP calls — slow and quota-heavy.

### `draftLeadReply(leadId, opts?): Promise<{ reply, lead }>`
- **Side effects:** AI call; patches lead `metadata.draft_reply` / `draft_reply_at`. Uses linked/filter/latest project brand voice when available.

### `markLeadContactedFromCopy(id): Promise<LeadDTO>`
- **Side effects:** Sets `status` to `contacted`; sets `contacted_at` (first time), always updates `outreach_copied_at`, increments `outreach_copy_count`.

### `updateTask(taskId, input): Promise<BoardTask>`
- **Params:** Partial title/description/status/priority/dueDate/estimatedHours/labels/checklist
- **Side effects:** Ownership check via project; sets/clears `completedAt` when status enters/leaves `done`; revalidates paths.

### `startLaunchMode(projectId, opts?): Promise<{ plan, playbookCount }>`
- **Side effects:** Upserts all core launch playbooks with AI copy packs; regenerates weekly plan with `launchMode: true`; revalidates growth + build-tracker.

### `prisma` (export from `src/lib/prisma.ts`)
- Not a function — a **Proxy** that recreates the client if growth/build delegates are missing (stale HMR after schema push).

---

## 6. Edge cases and gotchas

1. **Stale Prisma client after `db push`:** Hot reload can keep an old client; `brandVoiceTone` / `growthWeeklyPlan` then fail. Proxy helps; **restart `npm run dev`** if errors persist.
2. **`"use server"` files cannot re-export types** for the client bundler. Import types from `src/lib/task-types.ts` (etc.), not from action modules.
3. **Lead search vs Reddit blocking:** Public Reddit JSON often returns HTML to datacenter IPs. Prefer Reddit app credentials. Without posts, pipeline falls back to community-only leads.
4. **AI rate limits:** `AI_RATE_LIMIT_PER_HOUR` gates many features. Lead search alone uses multiple completions.
5. **SEO keyword volumes are AI estimates**, not Search Console / Semrush data — do not treat as ground truth.
6. **`getCurrentUser` catch-all:** Auth failures become `null` (no log). Debugging “Unauthorized” may need Clerk + DB email mismatch investigation.
7. **Task generate reload:** Kanban “Generate with AI” still uses `window.location.reload()` in places — local state is discarded.
8. **Encryption key:** GitHub/Vercel tokens require a valid 64-char hex `ENCRYPTION_KEY`; wrong length fails encryption helpers.
9. **Orphan marketing code:** Finding a file under `src/lib/ai/marketing` does **not** mean the UI calls it.
10. **Schema `app`:** Prisma models use `@@schema("app")` — migrations must target that Postgres schema.

---

## 7. Testing strategy

### What exists
- **Vitest** (`npm test`): `rate-limit`, `plan-limits`, `idea-scorer` under `src/lib/__tests__/`.
- **CI** (`.github/workflows/ci.yml`): Postgres service, `prisma validate` / `migrate deploy`, lint, typecheck, tests.

### Gaps / suggestions
- No E2E coverage for promote → Launch Mode → lead copy→contacted.
- Add integration tests for `toBoardTask` legacy parsing and lead metadata round-trips.
- Mock OpenAI + Reddit fetch in action-level tests so CI does not need live APIs.
- `<uncertain>` Whether CI migrate path matches all local `db push`-only schema changes without a migration file for every change — keep migrations in sync when shipping.

---

## 8. Modification guide (safe changes)

### Add a field to Task / Lead / Project
1. Edit `prisma/schema.prisma`.
2. `npx prisma db push` (dev) or create a migration for shared envs.
3. `npx prisma generate`.
4. Update DTO mappers (`toBoardTask`, `toLeadDTO`, growth DTOs).
5. Bump readiness checks in `src/lib/prisma.ts` if you add **new models**.
6. Restart dev server; run `npm run typecheck`.

### Add a Server Action
1. Put it in `src/lib/actions/<domain>.ts` with `"use server"`.
2. Call `requireAuth()` first; assert ownership with helpers in `src/lib/security/ownership.ts`.
3. For AI: `assertAiRateLimit` / `assertWithinPlanLimits` as peers do.
4. `revalidatePath` for affected routes.
5. **Do not** export TypeScript `type`s from the action file for client import.

### Wire a new Growth / Lead UI control
1. Prefer extending existing workspace + actions.
2. Keep rich data in `metadata` JSON if the schema is not ready — document keys.
3. Avoid blocking the UI on multi-step AI without a loading state (Lead Finder / Coach already do this).

### Touch webhooks
1. Verify signatures (Clerk/Stripe patterns already in tree).
2. Prefer idempotency tables (see Stripe) before applying side effects.
3. Only schedule/call **internal** trusted paths — never expose unauthenticated mutations.

### Common “don’ts”
- Don’t call `npx convex deploy`-style production deploys for this app’s DB — this stack is Prisma/Postgres, not Convex runtime.
- Don’t invent SEO/analytics numbers in the UI without labeling AI estimates.
- Don’t assume social publish works because `src/lib/social` exists.

---

## 9. Suggested reading order

1. `src/lib/auth.ts` → `src/lib/prisma.ts`  
2. `prisma/schema.prisma` (start at `User` / `Project`)  
3. `src/lib/actions/promote.ts`  
4. One vertical: `leads.ts` + `lead-finder.ts` + `lead-card.tsx`  
5. `tasks.ts` + kanban/detail sheets  
6. `growth.ts` + Launch Mode query handling in `growth-engine-workspace.tsx`

---

*Length target for this guide: concise training doc (~1.5–2k words). For a longer inventory/competitor analysis, see `docs/CODEBASE_TRAINING_GUIDE.md`.*
