-- AlterTable MarketingCampaign: competitive campaign fields
ALTER TABLE "app"."MarketingCampaign" ADD COLUMN IF NOT EXISTS "channels" JSONB;
ALTER TABLE "app"."MarketingCampaign" ADD COLUMN IF NOT EXISTS "campaignType" TEXT NOT NULL DEFAULT 'launch';
ALTER TABLE "app"."MarketingCampaign" ADD COLUMN IF NOT EXISTS "goal" TEXT;
ALTER TABLE "app"."MarketingCampaign" ADD COLUMN IF NOT EXISTS "audience" TEXT;
ALTER TABLE "app"."MarketingCampaign" ADD COLUMN IF NOT EXISTS "offer" TEXT;
ALTER TABLE "app"."MarketingCampaign" ADD COLUMN IF NOT EXISTS "positioning" JSONB;
ALTER TABLE "app"."MarketingCampaign" ADD COLUMN IF NOT EXISTS "spent" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "app"."MarketingCampaign" ADD COLUMN IF NOT EXISTS "startsAt" TIMESTAMP(3);
ALTER TABLE "app"."MarketingCampaign" ADD COLUMN IF NOT EXISTS "endsAt" TIMESTAMP(3);
ALTER TABLE "app"."MarketingCampaign" ADD COLUMN IF NOT EXISTS "metrics" JSONB;
ALTER TABLE "app"."MarketingCampaign" ADD COLUMN IF NOT EXISTS "checklist" JSONB;

CREATE INDEX IF NOT EXISTS "MarketingCampaign_userId_status_idx" ON "app"."MarketingCampaign"("userId", "status");

-- CreateTable CampaignAsset
CREATE TABLE IF NOT EXISTS "app"."CampaignAsset" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "dayOffset" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CampaignAsset_campaignId_idx" ON "app"."CampaignAsset"("campaignId");
CREATE INDEX IF NOT EXISTS "CampaignAsset_campaignId_dayOffset_idx" ON "app"."CampaignAsset"("campaignId", "dayOffset");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CampaignAsset_campaignId_fkey'
  ) THEN
    ALTER TABLE "app"."CampaignAsset"
      ADD CONSTRAINT "CampaignAsset_campaignId_fkey"
      FOREIGN KEY ("campaignId") REFERENCES "app"."MarketingCampaign"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
