# Phase 3 — Production Hardening

## Implemented

### Security
- `src/lib/security/ownership.ts` — shared project/lead/session ownership helpers
- AI rate limiting (`src/lib/rate-limit.ts`) on brainstorm, ideas, leads
- Plan limits (`src/lib/plan-limits.ts`) for leads/projects by tier
- `syncStripeSubscription` moved to internal `src/lib/stripe/sync.ts` (not client-callable)
- `syncBuildFromRepoBuild` moved out of server actions → `src/lib/build/sync-from-repo.ts`
- `fetchRepoStats` now requires auth
- `saveLead` validates `projectId` ownership
- Encryption key rotation via `ENCRYPTION_KEY_PREVIOUS`

### Auth
- Clerk webhook: `POST /api/clerk/webhook` (user.created/updated/deleted)
- All mutations continue to enforce `userId` via `requireAuth()` + ownership checks

### Data
- Prisma baseline migration: `prisma/migrations/20260805165000_init/`
- Compound indexes: `Lead(userId, createdAt)`, `Transaction(userId, createdAt)`
- `StripeWebhookEvent` table for idempotency
- Scripts: `db:migrate`, `db:migrate:deploy`
- Backup guide: `docs/BACKUPS.md`

### Observability
- Structured JSON logging (`src/lib/logger.ts`) in webhooks + health
- `GET /api/health` — DB ping + config checks
- `src/lib/error-tracking.ts` — ready for Sentry when Next.js peer dep aligns

### Testing
- Vitest: idea-scorer, rate-limit, plan-limits unit tests (`npm test`)
- CI: `.github/workflows/ci.yml` — validate, migrate, lint, typecheck, test, build

### Performance
- Paginated leads: `getLeadsPaginated()`
- Paginated transactions: `getTransactionsPaginated()`

### Compliance
- `/privacy`, `/terms` pages
- GDPR export/delete: `/dashboard/settings` + `src/lib/actions/gdpr.ts`
- **Production Readiness panel** — health, migration, webhooks, plan/AI usage on Settings

### Billing
- Stripe webhook idempotency via `StripeWebhookEvent`
- Handles: subscription deleted, invoice.payment_failed, charge.refunded
- Updates `User.subscriptionStatus` on sync/failure
- Sample revenue data blocked in production

## Setup checklist

1. Set `CLERK_WEBHOOK_SECRET` and point Clerk Dashboard webhook to `/api/clerk/webhook`
2. Production DB: `npm run db:migrate:deploy` (not `db:push`)
3. Configure `SENTRY_DSN` when @sentry/nextjs supports Next 16
4. Replace placeholder email in privacy policy before launch
5. Enable Supabase automated backups (see `docs/BACKUPS.md`)

## Remaining (future sprints)

- Redis-backed rate limiting for multi-instance deploys
- Playwright E2E for auth + CRUD flows
- Per-project CI webhook HMAC (instead of global secret)
- Full Sentry integration when package supports Next.js 16
- Load-more UI for leads/revenue pagination in client components
