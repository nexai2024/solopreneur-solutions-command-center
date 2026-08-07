# Database backups (production)

## Supabase / managed Postgres

1. Enable **daily automated backups** in your provider dashboard.
2. For point-in-time recovery (PITR), upgrade to a plan that supports it.
3. Test restore quarterly on a staging database.

## Manual backup

```bash
pg_dump "$DIRECT_URL" --schema=app --no-owner --file=backup-$(date +%Y%m%d).sql
```

## Restore (staging only)

```bash
psql "$DIRECT_URL" < backup-YYYYMMDD.sql
```

## Migrations in production

Use `npm run db:migrate:deploy` — never `db:push` in production.

```bash
DATABASE_URL=... DIRECT_URL=... npm run db:migrate:deploy
```
