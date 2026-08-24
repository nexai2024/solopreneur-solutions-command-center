-- AlterTable
ALTER TABLE "app"."Task" ADD COLUMN "milestoneId" TEXT;

-- CreateIndex
CREATE INDEX "Task_milestoneId_idx" ON "app"."Task"("milestoneId");

-- AddForeignKey
ALTER TABLE "app"."Task" ADD CONSTRAINT "Task_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "app"."Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
