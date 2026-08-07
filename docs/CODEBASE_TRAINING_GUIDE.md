# Solopreneur Command Center — Codebase Training Guide

**Audience:** Developers learning an AI-assisted Next.js product codebase  
**Source of truth:** Repository at analysis time (schema, `src/`, `package.json`)  
**Product name in UI:** Solopreneur OS  

---

## Table of contents

1. [Overview](#1-overview)
2. [High-level architecture](#2-high-level-architecture)
3. [Component breakdown](#3-component-breakdown)
4. [Data flow](#4-data-flow)
5. [Dependencies](#5-dependencies)
6. [Key functions and classes](#6-key-functions-and-classes)
7. [Existing feature inventory](#7-existing-feature-inventory)
8. [Improvement suggestions](#8-improvement-suggestions)
9. [Competitor landscape](#9-competitor-landscape)
10. [Gaps and unknowns](#10-gaps-and-unknowns)

---

## 1. Overview

### What it is

**Solopreneur Command Center** is a full-stack web app that aims to be an all-in-one operating system for one-person founders: idea validation → project/build management → lead discovery/outreach → growth/marketing → revenue monitoring → GitHub/Vercel ops.

It is **not** a generic Notion clone. It is a **product-aware workflow** where promoting an idea or lead creates a `Project` and fans out starter tasks/milestones into Build Tracker and Growth paths.

### Tech stack (observed)

| Layer | Choice |
|--------|--------|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript |
| Auth | Clerk (`@clerk/nextjs`) |
| Database | PostgreSQL (Supabase-hosted; Prisma schema uses `app` schema) |
| ORM | Prisma 7 (`@prisma/adapter-pg` + `pg`) |
| AI | OpenAI via `openai` SDK (`src/lib/ai-config.ts`) |
| Payments | Stripe |
| Git | Octokit + GitHub webhooks |
| Hosting integrations | Vercel API client (tokens encrypted at rest) |
| UI | Tailwind, Radix/shadcn-style components, Lucide, Sonner toasts |
| DnD | `@dnd-kit/*` (kanban boards) |
| Tests | Vitest (unit tests for rate limits, plan limits, idea scorer) |

### Mental model for new developers

```
Clerk User → Prisma User
                ↓
         owns Projects, Ideas, Leads, Revenue*, Connections
                ↓
     Project is the hub for Tasks, Content, SEO, Builds, Growth plans
```

Server mutations are mostly **Next.js Server Actions** (`"use server"` in `src/lib/actions/*`), not a separate REST API for app CRUD. External events arrive via **Route Handlers** under `src/app/api/*/webhook`.

---

## 2. High-level architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Client Components)                                 │
│  Workspaces: Brainstorm, Build Tracker, Lead Finder,         │
│  Growth Engine, Revenue, Repository, Settings                │
└───────────────────────────┬─────────────────────────────────┘
                            │ Server Actions / RSC
┌───────────────────────────▼─────────────────────────────────┐
│  Next.js App Router                                          │
│  pages: src/app/dashboard/*/page.tsx                         │
│  actions: src/lib/actions/*.ts                               │
│  AI: src/lib/ai/**                                           │
│  integrations: github/, vercel/, stripe/, leads/sources/     │
└─────────────┬───────────────────────────┬───────────────────┘
              │                           │
              ▼                           ▼
     Prisma Client (proxy)         OpenAI / Reddit / HN /
     PostgreSQL `app` schema       Stripe / GitHub / Vercel
```

### Important patterns

1. **Auth gate:** `requireAuth()` in `src/lib/auth.ts` maps Clerk identity → Prisma `User`.
2. **Ownership:** `src/lib/security/ownership.ts` ensures resources belong to the current user.
3. **Plan limits / AI rate limits:** `src/lib/plan-limits.ts`, `src/lib/rate-limit.ts`.
4. **Prisma singleton hygiene:** `src/lib/prisma.ts` uses a Proxy + readiness checks so schema pushes do not leave a stale client missing new models/fields (e.g. growth / brand voice).
5. **Promote bridge:** `promoteToProjectBundle` in `src/lib/actions/promote.ts` is the cross-module spine (idea/lead/node → Project + starter pack).
6. **Orphaned marketing libraries:** `src/lib/marketing/*`, many `src/lib/ai/marketing/*` modules, and some social publishers exist as designed libraries; Growth Engine Phase 1 wired *some* of them. Not everything is UI-connected.

---

## 3. Component breakdown

### 3.1 Auth & user lifecycle

| Piece | Path | Role |
|--------|------|------|
| Clerk UI | Landing + dashboard layout | Sign-in, `UserButton` |
| Clerk webhook | `src/app/api/clerk/webhook/route.ts` | User lifecycle sync |
| Auth helper | `src/lib/auth.ts` | Resolve DB user |

**Connects to:** Every server action; GDPR export/delete; Stripe customer linkage on `User`.

---

### 3.2 Brainstorm & Ideas

| Piece | Path | Role |
|--------|------|------|
| Page | `src/app/dashboard/brainstorm/page.tsx` | Entry |
| Copilot / nodes | `src/components/brainstorm/*` | Interactive ideation |
| Actions | `src/lib/actions/brainstorm.ts`, `ideas.ts` | Persist sessions/nodes/ideas |
| Scoring | `src/lib/idea-scorer.ts`, `src/lib/ai/brainstorm-ai.ts` | 7-dimension / AI scoring |
| Promote | `promote.ts` | Idea → Project |

**Internal behavior:** Ideas store feasibility/impact/speed/cost + `aiScore` / `scoringData`. Promoting creates a `Project`, links the idea, and can generate starter tasks/milestones via AI project helpers.

---

### 3.3 Build Tracker

| Piece | Path | Role |
|--------|------|------|
| Page | `src/app/dashboard/build-tracker/page.tsx` | Loads projects + builds + profile |
| Shell | `build-tracker.tsx` | Project switcher, tabs |
| Tasks | `task-kanban-board.tsx`, `task-detail-sheet.tsx` | Kanban + full task properties |
| Actions | `src/lib/actions/tasks.ts` | CRUD, reorder, AI generate, duplicate |
| Types | `src/lib/task-types.ts` | Priority, checklist, board DTOs |
| Builds | `build-pipeline-board.tsx`, `build-release-manager.tsx` | Pipeline statuses, artifacts |
| Repo / Vercel / Profile | `project-repo-section.tsx`, `project-profile-section.tsx` | Connections, env vars, notes |
| Launch Mode CTA | Button → Growth Engine with `launch=1` | Cross-module handoff |

**Task properties (implemented):** title, description, status (`todo` / `in-progress` / `done`), priority, due date, estimate, labels, checklist, timestamps; click-to-edit sheet; drag handle separate from click.

**Build pipeline statuses** (`src/lib/build-rbac.ts`): `queued` → `building` → `success` / `failed` → `in_qa` → `approved` → `released`.

**Connects to:** Growth (Launch Mode), Repository monitoring, GitHub webhook sync into build library.

---

### 3.4 Lead Finder

| Piece | Path | Role |
|--------|------|------|
| Page / workspace | `lead-finder/*` | Search, cards, filters |
| Actions | `src/lib/actions/leads.ts` | CRUD, AI search, draft reply, mark contacted |
| Discovery AI | `src/lib/ai/lead-finder.ts` | Communities → fetch → score posts |
| Sources | `src/lib/leads/sources/reddit.ts`, `hackernews.ts` | Live post fetch |
| Reply AI | `src/lib/ai/lead-reply.ts` | Brand-voice-aware draft comment |

**Pipeline:**

1. AI discovers communities + search queries for a niche.  
2. Fetches Reddit (OAuth if `REDDIT_CLIENT_*` set; else public/old.reddit) and HN (Algolia).  
3. AI scores posts for intent; persists `Lead` rows with rich `metadata` (author, body, scores, approach).  
4. **Draft reply** generates paste-ready text; **Copy & mark contacted** sets `status: contacted` and logs `contacted_at` / `outreach_copied_at` / `outreach_copy_count`.

**Connects to:** Brand voice / product context from `Project`; promote lead → project.

---

### 3.5 Growth Engine

| Piece | Path | Role |
|--------|------|------|
| Workspace | `growth-engine-workspace.tsx` | Tabs: Coach, Calendar, Playbooks, Campaigns, SEO |
| Coach | `growth-coach-panel.tsx` + `src/lib/ai/growth-coach.ts` | Weekly plan actions |
| Calendar | `content-calendar-board.tsx`, `content-detail-sheet.tsx` | Month grid, fan-out, A/B, hashtags, brand rewrite |
| Playbooks | `launch-playbooks-panel.tsx` + `src/lib/growth/playbooks.ts` | Interactive launch checklists + copy packs |
| Campaigns | `campaigns-panel.tsx` | Project-scoped `MarketingCampaign` |
| Actions | `src/lib/actions/growth.ts` | Keywords, content, plans, playbooks, brand voice |
| Launch Mode | Query `?launch=1&releaseId=&version=` | Activates playbooks + launch-week coach |

**Models used:** `SeoKeyword`, `ContentItem` (fan-out via `parentId`), `GrowthWeeklyPlan`, `LaunchPlaybookProgress`, `MarketingCampaign`, project brand voice fields.

**Still partial vs design:** Social OAuth publish stubs under `src/lib/social/*`; newsletter renderer/types under `src/lib/marketing/*` not fully productized; several AI marketing modules only partially wired.

---

### 3.6 Revenue & Billing

| Piece | Path | Role |
|--------|------|------|
| Workspace | `src/components/revenue/*` | MRR, subscriptions, campaigns summary (legacy home for campaigns) |
| Actions | `src/lib/actions/revenue.ts` | Stripe-backed reads / seed patterns |
| Webhooks | `src/app/api/stripe/webhook` + `src/lib/stripe/*` | Idempotent event handling (`StripeWebhookEvent`) |

**Connects to:** `User.subscriptionStatus`, plan limits, transactions.

---

### 3.7 Repository & CI

| Piece | Path | Role |
|--------|------|------|
| Workspace | `repository-workspace.tsx` | Repo linking / monitoring UI |
| GitHub | `src/lib/github/*`, webhooks | Commits, builds, PRs, changelog |
| Sync | `src/lib/build/sync-from-repo.ts` | Map CI → `BuildRelease` |
| Vercel | `src/lib/vercel/client.ts`, `actions/vercel.ts` | Deployments / env (encrypted) |

---

### 3.8 Settings, compliance, ops

| Piece | Path | Role |
|--------|------|------|
| Settings | `settings-workspace.tsx`, production readiness panel | Account + health |
| GDPR | `src/lib/actions/gdpr.ts` | Export / delete |
| Health | `src/app/api/health`, `src/lib/health.ts` | Ops check |
| Privacy / Terms | `src/app/privacy`, `terms` | Legal pages |

---

## 4. Data flow

### 4.1 Happy path: idea → shipped → marketed

```
1. User signs in (Clerk) → User row ensured
2. Brainstorm / Ideas → score → promoteToProjectBundle
3. Project created + starter Tasks/Milestones
4. Build Tracker: tasks move; builds advance pipeline
5. On approved/released build → Launch Mode → Growth Engine
6. Growth Coach + playbooks + content calendar
7. Lead Finder mines posts; draft reply; mark contacted
8. Stripe webhooks update revenue models (when configured)
```

### 4.2 Lead Finder (detailed)

```
niche (form)
  → searchLeadsWithAI (rate limit + plan limit)
  → discoverCommunities (OpenAI JSON)
  → fetchPostsFromCommunities (Reddit + HN HTTP)
  → scoreRelevantPosts (OpenAI JSON)
  → prisma.lead.create (title, source, url, contactName=author, metadata)
  → LeadCard UI
  → draftLeadReply (OpenAI + Project brand voice)
  → markLeadContactedFromCopy (status + metadata timestamps)
```

### 4.3 Growth content fan-out

```
ContentItem (parent)
  → fanOutContent
  → generateContentFanOut (AI)
  → child ContentItems (channel variants, parentId set)
```

### 4.4 External ingress

| Ingress | Handler | Writes |
|---------|---------|--------|
| Stripe webhook | `api/stripe/webhook` | Transactions, subscriptions, idempotency table |
| GitHub webhook | `api/github/webhook` | Repo models / builds |
| CI webhook | `api/ci/webhook` | Build sync |
| Clerk webhook | `api/clerk/webhook` | User lifecycle |

---

## 5. Dependencies

### Runtime (selected)

| Package | Role in this app |
|---------|------------------|
| `next` / `react` | App framework & UI |
| `@clerk/nextjs` | Authentication |
| `@prisma/client` + `adapter-pg` + `pg` | DB access |
| `openai` | LLM completions (JSON mode for structured outputs) |
| `stripe` / `@stripe/stripe-js` | Billing |
| `octokit` | GitHub API |
| `@dnd-kit/*` | Kanban drag-and-drop |
| `date-fns` | Calendar grid helpers |
| `zod` | Validation (forms / configs) |
| `svix` | Webhook signature verification (Clerk) |
| `sonner` | Toasts |
| Radix / CVA / Tailwind | Design system primitives |
| `@tiptap/*` | Present in deps; blog writer AI returns TipTap-shaped JSON — full editor productization is incomplete |
| `@supabase/supabase-js` | Present; primary DB access observed via Prisma + `DATABASE_URL` |

### Environment (observed / expected)

Documented by usage in code (do not commit secrets):

- `DATABASE_URL`, `DIRECT_URL`
- `OPENAI_API_KEY` (+ optional model overrides)
- Clerk public/secret + webhook secret
- `ENCRYPTION_KEY` (64 hex) for GitHub/Vercel tokens
- Stripe keys + webhook secret
- Optional: `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USER_AGENT`
- `AI_RATE_LIMIT_PER_HOUR`, `RESEND_API_KEY` (email send productization may be partial)

---

## 6. Key functions and classes

### Auth & data access

- **`requireAuth()`** — Ensures Clerk session and returns Prisma `User`.
- **`prisma` proxy (`src/lib/prisma.ts`)** — Recreates client if growth/build delegates missing; avoids “Unknown argument `brandVoiceTone`” after schema push without restart.

### Cross-cutting product spine

- **`promoteToProjectBundle(source)`** — Accepts idea | brainstorm node | lead | manual; creates/links `Project`; optionally runs starter milestones/tasks; revalidates multiple dashboards.

### Tasks

- **`toBoardTask` / `updateTask` / `reorderTasks`** — Normalize legacy AI priority-in-description; validate priority/status; set `completedAt` when moving to `done`.
- **`generateTasksForProject`** — AI starter tasks with proper `priority` / `estimatedHours` fields.

### Leads

- **`findLeadsForNiche`** — Orchestrates discover → fetch → score.
- **`draftHelpfulReply` / `draftLeadReply`** — Community-safe reply; persists `draft_reply` in metadata.
- **`markLeadContactedFromCopy`** — Status `contacted` + outreach timestamps/counters.

### Growth

- **`generateOrRefreshWeeklyPlan` / `startLaunchMode`** — Coach plan + activate playbooks with shared copy packs.
- **`fanOutContent` / `rewriteContentWithBrandVoice` / `planCalendarForProject`** — Content engine primitives.

### Integrations

- **`encrypt` / decrypt helpers (`encryption.ts`)** — AES key length validation; optional previous-key rotation.
- **Stripe webhook handler** — Idempotency via `StripeWebhookEvent`.
- **GitHub webhook processor** — Repo activity → monitoring / build sync.

---

## 7. Existing feature inventory

### Shipped / wired (observed in UI + actions)

| Area | Features |
|------|----------|
| Ideas | AI scoring, brainstorm sessions/nodes, promote to project |
| Build | Task kanban with full properties, milestones, build pipeline, releases, Launch Mode CTA |
| Project ops | GitHub connection, Vercel connection, env vars, deployments, tech stack/notes |
| Leads | Niche search, live Reddit/HN posts, AI relevance, draft reply, copy→contacted |
| Growth | Coach, brand voice, calendar + detail sheet, fan-out, hashtags, A/B titles, playbooks, campaigns, SEO keywords |
| Revenue | Subscriptions/transactions views, Stripe webhook path |
| Platform | Clerk auth, GDPR actions, privacy/terms, health endpoint, settings/readiness, Vitest + CI workflow files |

### Designed but incomplete / orphaned (exists in repo, not fully productized)

- Full social publish adapters (`src/lib/social/*` stubs)
- Newsletter block renderer + TipTap blog CMS end-to-end
- Several marketing AI modules unused in UI (competitor analyzer, ad copy, newsletter composer, etc.)
- Real SEO rank tracking / Search Console (keywords use AI-estimated volume/difficulty)
- Campaign “view details” depth under Revenue historically shallow; Growth now owns project campaigns

---

## 8. Improvement suggestions

### UX improvements

1. **Unified project context bar** across Lead Finder / Growth / Build so brand voice and Launch Mode always share the same selected project.  
2. **Lead Finder “Outreach this week” counter** (count leads with `outreach_copied_at` in last 7 days).  
3. **Growth Coach deep-links** — clicking an action opens calendar draft or playbook step.  
4. **Empty-state wizards** for first project (score idea → promote → generate coach plan).  
5. **Optimistic UI** for task/lead status toggles (already local in places; standardize).  
6. **Filter/saved views** for leads by intent (`buying`, `looking_for_tool`) and platform.

### Performance improvements

1. **Lead search:** Parallel AI + fetch is heavy; cache community discovery per niche (TTL), limit Reddit fan-out concurrency, stream progress to UI.  
2. **Build Tracker page:** Multiple parallel queries per project — batch or paginate builds.  
3. **Prisma generate on every `dev` start** — necessary for safety but slow; document when regenerate is required.  
4. **AI rate limit** (`AI_RATE_LIMIT_PER_HOUR`) — Lead search alone uses 2+ LLM calls; surface remaining quota in UI.  
5. **Avoid full page reloads** after AI task generation (`window.location.reload` still present in kanban generate path).

### Critical missing features

1. **Real social publishing** (OAuth + schedule → post) — currently calendar/status only.  
2. **Email/newsletter send path** (Resend key exists; product flow incomplete).  
3. **Attribution:** Growth action / lead outreach → Stripe customer (closed loop).  
4. **Reliable Reddit access** without credentials in restricted IPs — document OAuth as required for production.  
5. **Stronger SEO data** (or clear labeling that volumes are AI estimates).  
6. **E2E tests** for promote + lead mining + Launch Mode (unit tests exist; flow tests missing).

### Value-add features

1. **Auto-schedule fan-out** when Launch Mode starts (best-time slots).  
2. **CRM lite:** follow-up reminders on contacted leads.  
3. **Competitor watch** (wire existing `competitor-analyzer.ts`).  
4. **Weekly founder email digest** (coach + outreach + revenue delta).  
5. **Public changelog** from GitHub releases already synced.  
6. **Multi-brand workspaces** later — currently single-user solopreneur model.

---

## 9. Competitor landscape

Solopreneur OS competes less with one product and more with a **stack** of specialized tools. Below: named competitors overlapping major modules.

| Competitor | Key features | Comparison to Solopreneur OS |
|------------|--------------|------------------------------|
| **Linear** | Issue tracking, cycles, GitHub sync, priorities | Stronger pure engineering PM; weaker idea scoring, lead mining, launch playbooks, revenue. OS bundles tasks *with* product/growth context. |
| **Notion** | Docs, databases, light project mgmt | More flexible docs; weaker opinionated solo funnel (promote → tasks → launch → leads). OS is workflow-shaped, not wiki-shaped. |
| **Buffer** | Social scheduling, AI captions, analytics | Better multi-account publishing (OS scheduling is draft/calendar-level, publish stubs). OS stronger on product/build-linked Launch Mode. |
| **Predis.ai / Lately-class tools** | AI content generation & repurposing | Stronger creative media generation; OS fan-out is text-first and product-aware. |
| **SparkToro** | Audience research: where people hang out | Deeper audience intelligence data; OS goes further into **live post mining + draft outreach** on Reddit/HN. |
| **Exploding Topics** | Trend discovery | Better macro trends; OS is niche→communities→posts for GTM, not trend charts. |
| **HubSpot** | CRM, email, attribution, marketing hub | Enterprise breadth and maturity; heavy for solos. OS is lighter, AI-assisted, builder-native. |
| **Kit (ConvertKit) / Beehiiv** | Email sequences, creator newsletters | Mature send/growth loops; OS newsletter composer/types exist but send productization incomplete. |
| **Semrush / Ahrefs** | Keyword research, rank tracking | Real SEO data moat; OS SEO is keyword lists + AI estimates + content briefs path. |
| **Jasper / Copy.ai** | Brand voice marketing copy | Strong writing templates; OS brand voice is tied to Project and used in growth/leads replies. |
| **Attio / lightweight CRMs** | Modern CRM for startups | Better pipeline CRM; OS lead model is outreach-from-communities oriented, not full sales stages. |
| **ShipFast / boilerplates** | Code starters for indie SaaS | Help you *build* the product; OS helps you *operate* idea→build→GTM after. |
| **Indie Hackers / Product Hunt (platforms)** | Communities & launches | Destinations OS playbooks target; not operating systems themselves. |

### Positioning summary

| Dimension | Typical stack | Solopreneur OS bet |
|-----------|---------------|--------------------|
| Context | Fragmented across 6–10 tools | Single `Project` hub |
| Marketing for non-marketers | Blank calendars + generic AI posts | Coach + playbooks + post-level leads |
| Build ↔ GTM | Manual handoff | Launch Mode from build pipeline |
| Cost | $150–400/mo tool sprawl (common solo stacks) | One subscription narrative (billing via Stripe; plan limits in code) |

---

## 10. Gaps and unknowns

Stated honestly from code inspection:

- Exact production deployment topology (Vercel project settings, multi-env) is **not fully specified** in-repo beyond scripts and integrations.  
- Whether `@supabase/supabase-js` is used beyond Prisma/Postgres hosting is **not deeply evidenced** in the paths reviewed; DB access is Prisma-centric.  
- TipTap is a dependency; a full in-app blog CMS UX was **not confirmed as complete**.  
- Some Growth AI modules remain **library-only**.  
- Competitor feature parity tables above are **product-category comparisons**, not claim that OS currently matches each competitor feature-for-feature.

---

## Appendix A — Dashboard routes (nav)

| Route | Module |
|-------|--------|
| `/dashboard` | Overview |
| `/dashboard/brainstorm` | Brainstorm & Ideas |
| `/dashboard/build-tracker` | Build Tracker |
| `/dashboard/lead-finder` | Lead Finder |
| `/dashboard/growth-engine` | Growth Engine |
| `/dashboard/revenue` | Revenue & Billing |
| `/dashboard/repository` | Repository & VCS |
| `/dashboard/settings` | Settings |

## Appendix B — Suggested reading order for new developers

1. `src/lib/auth.ts` → `src/lib/prisma.ts`  
2. `src/lib/actions/promote.ts` (spine)  
3. `prisma/schema.prisma` (Project hub)  
4. One vertical end-to-end: `leads.ts` + `lead-finder.ts` + `lead-card.tsx`  
5. `tasks.ts` + kanban/detail sheets  
6. `growth.ts` + Launch Mode query handling  
7. Webhooks under `src/app/api/*/webhook`

---

*Generated for developer training from the live repository structure and modules. Update this guide when major Phase 2+ Growth publish/email/attribution work lands.*
