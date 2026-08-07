import { LeadFinderWorkspace } from "@/components/lead-finder/lead-finder-workspace";
import { getLeads } from "@/lib/actions/leads";
import { getProjectsForUser } from "@/lib/actions/dashboard";

export const dynamic = "force-dynamic";

export default async function LeadFinderPage() {
  const [leads, projects] = await Promise.all([
    getLeads(),
    getProjectsForUser(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lead Finder</h1>
        <p className="text-muted-foreground">
          Mine Reddit and Hacker News for real posts from people in your niche —
          with author, thread, intent, and a suggested approach.
        </p>
      </div>
      <LeadFinderWorkspace
        initialLeads={leads}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}
