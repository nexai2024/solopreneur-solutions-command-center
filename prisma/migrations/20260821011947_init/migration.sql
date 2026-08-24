-- AlterTable
ALTER TABLE "app"."ContentItem" ADD COLUMN     "channel" TEXT,
ADD COLUMN     "hashtags" JSONB,
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "app"."MarketingCampaign" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "app"."Project" ADD COLUMN     "brandAudience" TEXT,
ADD COLUMN     "brandVoiceAvoid" JSONB,
ADD COLUMN     "brandVoiceTone" JSONB;

-- AlterTable
ALTER TABLE "app"."Task" ADD COLUMN     "checklist" JSONB,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "estimatedHours" DOUBLE PRECISION,
ADD COLUMN     "labels" JSONB,
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "app"."GrowthWeeklyPlan" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "actions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowthWeeklyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."LaunchPlaybookProgress" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "playbookId" TEXT NOT NULL,
    "buildReleaseId" TEXT,
    "launchDate" TIMESTAMP(3),
    "checklist" JSONB NOT NULL,
    "copyPacks" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LaunchPlaybookProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GrowthWeeklyPlan_projectId_weekStart_idx" ON "app"."GrowthWeeklyPlan"("projectId", "weekStart");

-- CreateIndex
CREATE INDEX "LaunchPlaybookProgress_projectId_idx" ON "app"."LaunchPlaybookProgress"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "LaunchPlaybookProgress_projectId_playbookId_key" ON "app"."LaunchPlaybookProgress"("projectId", "playbookId");

-- CreateIndex
CREATE INDEX "ContentItem_projectId_scheduledAt_idx" ON "app"."ContentItem"("projectId", "scheduledAt");

-- CreateIndex
CREATE INDEX "ContentItem_parentId_idx" ON "app"."ContentItem"("parentId");

-- CreateIndex
CREATE INDEX "MarketingCampaign_projectId_idx" ON "app"."MarketingCampaign"("projectId");

-- CreateIndex
CREATE INDEX "Task_projectId_status_idx" ON "app"."Task"("projectId", "status");

-- AddForeignKey
ALTER TABLE "app"."ContentItem" ADD CONSTRAINT "ContentItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "app"."ContentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."GrowthWeeklyPlan" ADD CONSTRAINT "GrowthWeeklyPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "app"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."LaunchPlaybookProgress" ADD CONSTRAINT "LaunchPlaybookProgress_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "app"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "app"."Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
