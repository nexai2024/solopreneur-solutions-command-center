"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { LeadSearchForm } from "@/components/lead-finder/lead-search-form";
import { LeadCard } from "@/components/lead-finder/lead-card";
import { ManualLeadDialog } from "@/components/lead-finder/manual-lead-dialog";
import {
  deleteLead,
  draftLeadReply,
  markLeadContactedFromCopy,
  promoteLeadToProject,
  saveLead,
  searchLeadsWithAI,
  updateLeadStatus,
  type LeadDTO,
  type LeadStatus,
} from "@/lib/actions/leads";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HowDoILink } from "@/components/help/how-do-i-link";

type ProjectOption = { id: string; name: string };

export function LeadFinderWorkspace({
  initialLeads,
  projects,
}: {
  initialLeads: LeadDTO[];
  projects: ProjectOption[];
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const voiceProjectId =
    projectFilter !== "all" && projectFilter !== "unassigned"
      ? projectFilter
      : null;

  const filtered =
    projectFilter === "all"
      ? leads
      : projectFilter === "unassigned"
        ? leads.filter((l) => !l.project_id)
        : leads.filter((l) => l.project_id === projectFilter);

  const handleSearch = async (niche: string) => {
    startTransition(async () => {
      try {
        const found = await searchLeadsWithAI(niche);
        setLeads((prev) => [...found, ...prev]);
        toast.success(
          `Found ${found.length} leads (${found.filter((l) => l.metadata?.lead_type === "post").length} live posts)`
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Search failed");
      }
    });
  };

  const handleStatusChange = (id: string, status: LeadStatus) => {
    startTransition(async () => {
      await updateLeadStatus(id, status);
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteLead(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
      toast.success("Lead deleted");
    });
  };

  const handlePromote = (id: string) => {
    setPromotingId(id);
    startTransition(async () => {
      try {
        const project = await promoteLeadToProject(id);
        setLeads((prev) =>
          prev.map((l) =>
            l.id === id
              ? { ...l, status: "qualified" as LeadStatus, project_id: project.id }
              : l
          )
        );
        toast.success(`"${project.name}" created — open Build Tracker to plan`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Promotion failed");
      } finally {
        setPromotingId(null);
      }
    });
  };

  const handleDraftReply = async (id: string) => {
    setDraftingId(id);
    try {
      const { reply, lead } = await draftLeadReply(id, {
        projectId: voiceProjectId,
      });
      setLeads((prev) => prev.map((l) => (l.id === id ? lead : l)));
      toast.success("Reply drafted — copy and paste into the thread");
      return reply;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Draft failed");
      throw err;
    } finally {
      setDraftingId(null);
    }
  };

  const handleReplyCopied = async (id: string) => {
    const updated = await markLeadContactedFromCopy(id);
    setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
  };

  const handleManualSave = async (partial: {
    title?: string;
    description?: string;
    source?: string;
    url?: string;
    status?: LeadStatus;
  }) => {
    if (!partial.title) return;
    const lead = await saveLead({
      title: partial.title,
      description: partial.description,
      source: partial.source,
      url: partial.url,
      projectId: projectFilter !== "all" && projectFilter !== "unassigned" ? projectFilter : undefined,
    });
    setLeads((prev) => [lead, ...prev]);
    toast.success("Lead saved");
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4">
        <LeadSearchForm onSearch={handleSearch} isLoading={isPending} />
        <div className="flex flex-wrap items-center gap-3">
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All leads</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add manually
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No leads yet. Search by niche or add one manually.
          </p>
          <HowDoILink section="lead-finder" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              onPromote={handlePromote}
              onDraftReply={handleDraftReply}
              onReplyCopied={handleReplyCopied}
              promoting={promotingId === lead.id}
              drafting={draftingId === lead.id}
            />
          ))}
        </div>
      )}

      <ManualLeadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleManualSave}
      />
    </div>
  );
}
