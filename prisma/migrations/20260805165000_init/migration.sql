-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "app";

-- CreateTable
CREATE TABLE "app"."User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "stripeCustomerId" TEXT,
    "subscriptionStatus" TEXT DEFAULT 'free',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "repoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planning',
    "currentVersion" TEXT,
    "productionUrl" TEXT,
    "hostingProvider" TEXT,
    "techStack" JSONB,
    "toolsUsed" JSONB,
    "devNotes" TEXT,
    "aiNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."Idea" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "feasibility" INTEGER NOT NULL DEFAULT 0,
    "impact" INTEGER NOT NULL DEFAULT 0,
    "speed" INTEGER NOT NULL DEFAULT 0,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "aiScore" DOUBLE PRECISION,
    "scoringData" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Idea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."BrainstormSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrainstormSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."BrainstormCopilotMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "focusNode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrainstormCopilotMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."BrainstormNode" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "parentId" TEXT,
    "label" TEXT NOT NULL,
    "content" TEXT,
    "type" TEXT NOT NULL DEFAULT 'user_input',
    "nodeType" TEXT NOT NULL DEFAULT 'Idea',
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB,
    "positionX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "positionY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "coreProblem" TEXT,
    "proposedSolution" TEXT,
    "targetUserPersona" TEXT,
    "viabilityScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrainstormNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."Lead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "contactName" TEXT,
    "email" TEXT,
    "company" TEXT,
    "source" TEXT,
    "url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "metadata" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."Task" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "ideaId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "order" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."Milestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."SeoKeyword" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "targetUrl" TEXT,
    "difficulty" INTEGER NOT NULL DEFAULT 0,
    "searchVolume" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeoKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."ContentItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'blog',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduledAt" TIMESTAMP(3),
    "contentBody" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."MarketingCampaign" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."RevenueCustomer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevenueCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."RevenuePlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "interval" TEXT NOT NULL DEFAULT 'month',
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevenuePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."RevenueSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "stripeSubscriptionId" TEXT,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevenueSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customerId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "source" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'payment',
    "status" TEXT NOT NULL DEFAULT 'succeeded',
    "stripePaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."GithubConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'github',
    "repoUrl" TEXT NOT NULL,
    "repoOwner" TEXT,
    "repoName" TEXT,
    "repoFullName" TEXT,
    "defaultBranch" TEXT NOT NULL DEFAULT 'main',
    "accessTokenEncrypted" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GithubConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."RepoWebhookDelivery" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "projectId" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepoWebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."RepoCommit" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sha" TEXT NOT NULL,
    "shortSha" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "authorAvatar" TEXT,
    "branch" TEXT NOT NULL,
    "environment" TEXT,
    "htmlUrl" TEXT NOT NULL,
    "committedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepoCommit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."RepoBuild" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "commitSha" TEXT NOT NULL,
    "commitRecordId" TEXT,
    "branch" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "context" TEXT NOT NULL DEFAULT 'solopreneur-cc/build',
    "previewUrl" TEXT,
    "changelog" TEXT,
    "prNumber" INTEGER,
    "buildBreakerSha" TEXT,
    "buildBreakerName" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "RepoBuild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."RepoRelease" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "name" TEXT,
    "sha" TEXT NOT NULL,
    "htmlUrl" TEXT NOT NULL,
    "changelog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepoRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."RepoPullRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "authorLogin" TEXT NOT NULL,
    "authorAvatar" TEXT,
    "headBranch" TEXT NOT NULL,
    "baseBranch" TEXT NOT NULL,
    "htmlUrl" TEXT NOT NULL,
    "previewUrl" TEXT,
    "buildStatus" TEXT,
    "headSha" TEXT,
    "approvalsCount" INTEGER NOT NULL DEFAULT 0,
    "changesRequested" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "reviewCommentsCount" INTEGER NOT NULL DEFAULT 0,
    "mergeable" BOOLEAN,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepoPullRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."BuildRelease" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "appName" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "buildNumber" INTEGER NOT NULL,
    "environment" TEXT NOT NULL,
    "pipelineStatus" TEXT NOT NULL DEFAULT 'queued',
    "branch" TEXT,
    "commitSha" TEXT,
    "commitUrl" TEXT,
    "releaseNotes" TEXT,
    "testingInstructions" TEXT,
    "knownIssues" TEXT,
    "previewUrl" TEXT,
    "buildDurationMs" INTEGER,
    "artifactSizeBytes" BIGINT,
    "previousSizeBytes" BIGINT,
    "testPassRate" DOUBLE PRECISION,
    "testFailedCount" INTEGER,
    "testTotalCount" INTEGER,
    "repoBuildId" TEXT,
    "ciProvider" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."BuildArtifact" (
    "id" TEXT NOT NULL,
    "buildReleaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "artifactType" TEXT NOT NULL,
    "downloadUrl" TEXT NOT NULL,
    "sizeBytes" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuildArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."VercelConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "vercelTeamId" TEXT,
    "vercelProjectId" TEXT NOT NULL,
    "vercelProjectName" TEXT,
    "accessTokenEncrypted" TEXT NOT NULL,
    "productionDomain" TEXT,
    "framework" TEXT,
    "nodeVersion" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VercelConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."ProjectEnvVar" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueEncrypted" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "isSecret" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "vercelEnvId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectEnvVar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."ProjectDeployment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "vercelDeploymentId" TEXT,
    "url" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "version" TEXT,
    "commitSha" TEXT,
    "commitMessage" TEXT,
    "branch" TEXT,
    "builder" TEXT,
    "deployedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDeployment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "app"."User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "app"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "app"."User"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "app"."Project"("userId");

-- CreateIndex
CREATE INDEX "Idea_userId_idx" ON "app"."Idea"("userId");

-- CreateIndex
CREATE INDEX "Idea_projectId_idx" ON "app"."Idea"("projectId");

-- CreateIndex
CREATE INDEX "BrainstormSession_userId_idx" ON "app"."BrainstormSession"("userId");

-- CreateIndex
CREATE INDEX "BrainstormCopilotMessage_sessionId_createdAt_idx" ON "app"."BrainstormCopilotMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "BrainstormNode_sessionId_idx" ON "app"."BrainstormNode"("sessionId");

-- CreateIndex
CREATE INDEX "BrainstormNode_parentId_idx" ON "app"."BrainstormNode"("parentId");

-- CreateIndex
CREATE INDEX "Lead_userId_idx" ON "app"."Lead"("userId");

-- CreateIndex
CREATE INDEX "Lead_projectId_idx" ON "app"."Lead"("projectId");

-- CreateIndex
CREATE INDEX "Lead_userId_createdAt_idx" ON "app"."Lead"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Task_projectId_idx" ON "app"."Task"("projectId");

-- CreateIndex
CREATE INDEX "Milestone_projectId_idx" ON "app"."Milestone"("projectId");

-- CreateIndex
CREATE INDEX "SeoKeyword_projectId_idx" ON "app"."SeoKeyword"("projectId");

-- CreateIndex
CREATE INDEX "ContentItem_projectId_idx" ON "app"."ContentItem"("projectId");

-- CreateIndex
CREATE INDEX "MarketingCampaign_userId_idx" ON "app"."MarketingCampaign"("userId");

-- CreateIndex
CREATE INDEX "RevenueCustomer_userId_idx" ON "app"."RevenueCustomer"("userId");

-- CreateIndex
CREATE INDEX "RevenuePlan_userId_idx" ON "app"."RevenuePlan"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueSubscription_stripeSubscriptionId_key" ON "app"."RevenueSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "RevenueSubscription_userId_idx" ON "app"."RevenueSubscription"("userId");

-- CreateIndex
CREATE INDEX "RevenueSubscription_customerId_idx" ON "app"."RevenueSubscription"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_stripePaymentId_key" ON "app"."Transaction"("stripePaymentId");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "app"."Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_userId_createdAt_idx" ON "app"."Transaction"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StripeWebhookEvent_eventId_key" ON "app"."StripeWebhookEvent"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "GithubConnection_projectId_key" ON "app"."GithubConnection"("projectId");

-- CreateIndex
CREATE INDEX "GithubConnection_userId_idx" ON "app"."GithubConnection"("userId");

-- CreateIndex
CREATE INDEX "GithubConnection_repoFullName_idx" ON "app"."GithubConnection"("repoFullName");

-- CreateIndex
CREATE UNIQUE INDEX "RepoWebhookDelivery_deliveryId_key" ON "app"."RepoWebhookDelivery"("deliveryId");

-- CreateIndex
CREATE INDEX "RepoWebhookDelivery_status_createdAt_idx" ON "app"."RepoWebhookDelivery"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RepoWebhookDelivery_projectId_idx" ON "app"."RepoWebhookDelivery"("projectId");

-- CreateIndex
CREATE INDEX "RepoCommit_projectId_branch_idx" ON "app"."RepoCommit"("projectId", "branch");

-- CreateIndex
CREATE INDEX "RepoCommit_projectId_committedAt_idx" ON "app"."RepoCommit"("projectId", "committedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RepoCommit_projectId_sha_key" ON "app"."RepoCommit"("projectId", "sha");

-- CreateIndex
CREATE INDEX "RepoBuild_projectId_branch_startedAt_idx" ON "app"."RepoBuild"("projectId", "branch", "startedAt");

-- CreateIndex
CREATE INDEX "RepoBuild_projectId_environment_idx" ON "app"."RepoBuild"("projectId", "environment");

-- CreateIndex
CREATE INDEX "RepoBuild_projectId_commitSha_idx" ON "app"."RepoBuild"("projectId", "commitSha");

-- CreateIndex
CREATE INDEX "RepoRelease_projectId_createdAt_idx" ON "app"."RepoRelease"("projectId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RepoRelease_projectId_tag_key" ON "app"."RepoRelease"("projectId", "tag");

-- CreateIndex
CREATE INDEX "RepoPullRequest_projectId_state_idx" ON "app"."RepoPullRequest"("projectId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "RepoPullRequest_projectId_number_key" ON "app"."RepoPullRequest"("projectId", "number");

-- CreateIndex
CREATE INDEX "BuildRelease_projectId_pipelineStatus_idx" ON "app"."BuildRelease"("projectId", "pipelineStatus");

-- CreateIndex
CREATE INDEX "BuildRelease_projectId_environment_idx" ON "app"."BuildRelease"("projectId", "environment");

-- CreateIndex
CREATE INDEX "BuildRelease_projectId_createdAt_idx" ON "app"."BuildRelease"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "BuildArtifact_buildReleaseId_idx" ON "app"."BuildArtifact"("buildReleaseId");

-- CreateIndex
CREATE UNIQUE INDEX "VercelConnection_projectId_key" ON "app"."VercelConnection"("projectId");

-- CreateIndex
CREATE INDEX "VercelConnection_userId_idx" ON "app"."VercelConnection"("userId");

-- CreateIndex
CREATE INDEX "VercelConnection_vercelProjectId_idx" ON "app"."VercelConnection"("vercelProjectId");

-- CreateIndex
CREATE INDEX "ProjectEnvVar_projectId_idx" ON "app"."ProjectEnvVar"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectEnvVar_projectId_key_environment_key" ON "app"."ProjectEnvVar"("projectId", "key", "environment");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDeployment_vercelDeploymentId_key" ON "app"."ProjectDeployment"("vercelDeploymentId");

-- CreateIndex
CREATE INDEX "ProjectDeployment_projectId_deployedAt_idx" ON "app"."ProjectDeployment"("projectId", "deployedAt");

-- CreateIndex
CREATE INDEX "ProjectDeployment_projectId_environment_idx" ON "app"."ProjectDeployment"("projectId", "environment");

-- AddForeignKey
ALTER TABLE "app"."Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."Idea" ADD CONSTRAINT "Idea_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."Idea" ADD CONSTRAINT "Idea_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "app"."Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."BrainstormSession" ADD CONSTRAINT "BrainstormSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."BrainstormCopilotMessage" ADD CONSTRAINT "BrainstormCopilotMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "app"."BrainstormSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."BrainstormNode" ADD CONSTRAINT "BrainstormNode_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "app"."BrainstormSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."Lead" ADD CONSTRAINT "Lead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."Lead" ADD CONSTRAINT "Lead_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "app"."Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "app"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "app"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."SeoKeyword" ADD CONSTRAINT "SeoKeyword_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "app"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."ContentItem" ADD CONSTRAINT "ContentItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "app"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."RevenueCustomer" ADD CONSTRAINT "RevenueCustomer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."RevenuePlan" ADD CONSTRAINT "RevenuePlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."RevenueSubscription" ADD CONSTRAINT "RevenueSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."RevenueSubscription" ADD CONSTRAINT "RevenueSubscription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "app"."RevenueCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."RevenueSubscription" ADD CONSTRAINT "RevenueSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "app"."RevenuePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."Transaction" ADD CONSTRAINT "Transaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "app"."RevenueCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."GithubConnection" ADD CONSTRAINT "GithubConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."GithubConnection" ADD CONSTRAINT "GithubConnection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "app"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."RepoCommit" ADD CONSTRAINT "RepoCommit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "app"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."RepoBuild" ADD CONSTRAINT "RepoBuild_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "app"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."RepoBuild" ADD CONSTRAINT "RepoBuild_commitRecordId_fkey" FOREIGN KEY ("commitRecordId") REFERENCES "app"."RepoCommit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."RepoRelease" ADD CONSTRAINT "RepoRelease_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "app"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."RepoPullRequest" ADD CONSTRAINT "RepoPullRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "app"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."BuildRelease" ADD CONSTRAINT "BuildRelease_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "app"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."BuildRelease" ADD CONSTRAINT "BuildRelease_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."BuildArtifact" ADD CONSTRAINT "BuildArtifact_buildReleaseId_fkey" FOREIGN KEY ("buildReleaseId") REFERENCES "app"."BuildRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."VercelConnection" ADD CONSTRAINT "VercelConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."VercelConnection" ADD CONSTRAINT "VercelConnection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "app"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."ProjectEnvVar" ADD CONSTRAINT "ProjectEnvVar_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "app"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."ProjectDeployment" ADD CONSTRAINT "ProjectDeployment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "app"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
