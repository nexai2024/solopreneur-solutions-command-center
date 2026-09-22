-- CreateTable
CREATE TABLE "app"."ProjectArtifact" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'text',
    "body" TEXT,
    "url" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "fileName" TEXT,
    "tags" JSONB,
    "metadata" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectArtifact_projectId_idx" ON "app"."ProjectArtifact"("projectId");

-- CreateIndex
CREATE INDEX "ProjectArtifact_projectId_kind_idx" ON "app"."ProjectArtifact"("projectId", "kind");

-- CreateIndex
CREATE INDEX "ProjectArtifact_userId_idx" ON "app"."ProjectArtifact"("userId");

-- AddForeignKey
ALTER TABLE "app"."ProjectArtifact" ADD CONSTRAINT "ProjectArtifact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "app"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
