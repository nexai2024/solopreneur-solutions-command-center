-- AlterTable User
ALTER TABLE "app"."User" ADD COLUMN IF NOT EXISTS "portfolioSlug" TEXT;
ALTER TABLE "app"."User" ADD COLUMN IF NOT EXISTS "portfolioPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "app"."User" ADD COLUMN IF NOT EXISTS "portfolioHeadline" TEXT;
ALTER TABLE "app"."User" ADD COLUMN IF NOT EXISTS "portfolioBio" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_portfolioSlug_key" ON "app"."User"("portfolioSlug");

-- AlterTable Project
ALTER TABLE "app"."Project" ADD COLUMN IF NOT EXISTS "publicSlug" TEXT;
ALTER TABLE "app"."Project" ADD COLUMN IF NOT EXISTS "portfolioVisible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "app"."Project" ADD COLUMN IF NOT EXISTS "portfolioBlurb" TEXT;
ALTER TABLE "app"."Project" ADD COLUMN IF NOT EXISTS "earlyAccessSlug" TEXT;
ALTER TABLE "app"."Project" ADD COLUMN IF NOT EXISTS "earlyAccessEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "app"."Project" ADD COLUMN IF NOT EXISTS "earlyAccessHeadline" TEXT;
ALTER TABLE "app"."Project" ADD COLUMN IF NOT EXISTS "earlyAccessBody" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Project_earlyAccessSlug_key" ON "app"."Project"("earlyAccessSlug");
CREATE UNIQUE INDEX IF NOT EXISTS "Project_userId_publicSlug_key" ON "app"."Project"("userId", "publicSlug");

-- AlterTable Task
ALTER TABLE "app"."Task" ADD COLUMN IF NOT EXISTS "featureId" TEXT;
CREATE INDEX IF NOT EXISTS "Task_featureId_idx" ON "app"."Task"("featureId");

-- CreateTable ProjectFeature
CREATE TABLE IF NOT EXISTS "app"."ProjectFeature" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'MVP',
    "status" TEXT NOT NULL DEFAULT 'todo',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectFeature_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProjectFeature_projectId_idx" ON "app"."ProjectFeature"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectFeature_projectId_category_idx" ON "app"."ProjectFeature"("projectId", "category");

ALTER TABLE "app"."ProjectFeature" DROP CONSTRAINT IF EXISTS "ProjectFeature_projectId_fkey";
ALTER TABLE "app"."ProjectFeature" ADD CONSTRAINT "ProjectFeature_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "app"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "app"."Task" DROP CONSTRAINT IF EXISTS "Task_featureId_fkey";
ALTER TABLE "app"."Task" ADD CONSTRAINT "Task_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "app"."ProjectFeature"("id") ON DELETE SET NULL ON UPDATE CASCADE;
