-- Deduplicate leads by (userId, normalized url) before unique index
-- Prefer newest createdAt

UPDATE "app"."Lead"
SET url = regexp_replace(url, '/+$', '')
WHERE url IS NOT NULL AND url ~ '/$';

UPDATE "app"."Lead"
SET url = NULL
WHERE url IS NOT NULL AND btrim(url) = '';

DELETE FROM "app"."Lead" a
USING "app"."Lead" b
WHERE a.url IS NOT NULL
  AND b.url IS NOT NULL
  AND a."userId" = b."userId"
  AND a.url = b.url
  AND (
    a."createdAt" < b."createdAt"
    OR (a."createdAt" = b."createdAt" AND a.id < b.id)
  );

CREATE UNIQUE INDEX "Lead_userId_url_key" ON "app"."Lead"("userId", "url");
