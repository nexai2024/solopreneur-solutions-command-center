import { Suspense } from "react";
import { GrowthEngineWorkspace } from "@/components/growth-engine/growth-engine-workspace";
import { getProjectsForUser } from "@/lib/actions/dashboard";

export const dynamic = "force-dynamic";

export default async function GrowthEnginePage() {
  const projects = await getProjectsForUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Growth Engine</h1>
        <p className="text-muted-foreground">
          AI growth coach, content calendar, launch playbooks, and campaigns —
          built for solopreneurs who are not marketers.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <GrowthEngineWorkspace
          projects={projects.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
          }))}
        />
      </Suspense>
    </div>
  );
}
