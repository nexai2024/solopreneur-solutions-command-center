"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Lead } from "@/lib/leads";
import {
  ExternalLink,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Rocket,
  MessageSquare,
  ArrowUpRight,
  User,
  Copy,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface LeadCardProps {
  lead: Lead;
  onStatusChange: (id: string, status: Lead["status"]) => void;
  onDelete: (id: string) => void;
  onPromote?: (id: string) => void;
  onDraftReply?: (id: string) => Promise<string>;
  /** Called after a successful clipboard copy of the draft reply */
  onReplyCopied?: (id: string) => Promise<void> | void;
  promoting?: boolean;
  drafting?: boolean;
}

function metaString(meta: Record<string, unknown>, key: string): string | null {
  const v = meta[key];
  return typeof v === "string" && v.trim() ? v : null;
}

function metaNumber(meta: Record<string, unknown>, key: string): number | null {
  const v = meta[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

const INTENT_LABELS: Record<string, string> = {
  buying: "Buying intent",
  pain: "Pain signal",
  looking_for_tool: "Looking for tool",
  advice: "Asking advice",
  hiring: "Hiring",
  other: "Signal",
};

export function LeadCard({
  lead,
  onStatusChange,
  onDelete,
  onPromote,
  onDraftReply,
  onReplyCopied,
  promoting,
  drafting,
}: LeadCardProps) {
  const statusColors: Record<string, string> = {
    new: "text-blue-500 bg-blue-500/10",
    qualified: "text-green-500 bg-green-500/10",
    contacted: "text-purple-500 bg-purple-500/10",
    rejected: "text-red-500 bg-red-500/10",
    lost: "text-orange-500 bg-orange-500/10",
  };

  const meta = lead.metadata ?? {};
  const relevance = Number(meta.relevance_score ?? 0);
  const author = metaString(meta, "author");
  const authorUrl = metaString(meta, "author_profile_url");
  const postBody = metaString(meta, "post_body");
  const community = metaString(meta, "community") || lead.source;
  const platform = metaString(meta, "platform");
  const intent = metaString(meta, "intent");
  const approach = metaString(meta, "approach_angle");
  const leadType = metaString(meta, "lead_type");
  const score = metaNumber(meta, "score");
  const comments = metaNumber(meta, "comment_count");
  const postedAt = metaString(meta, "posted_at");
  const savedDraft = metaString(meta, "draft_reply");
  const contactedAt = metaString(meta, "contacted_at");
  const outreachCopiedAt = metaString(meta, "outreach_copied_at");
  const [localDraft, setLocalDraft] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const draft = localDraft ?? savedDraft;

  const copyDraft = async () => {
    if (!draft) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(draft);
    } catch {
      toast.error("Could not copy");
      setCopying(false);
      return;
    }

    try {
      if (onReplyCopied) {
        await onReplyCopied(lead.id);
      }
      toast.success("Copied — marked contacted. Paste into the thread.");
    } catch {
      toast.success("Copied to clipboard");
      toast.error("Copied, but failed to update status");
    } finally {
      setCopying(false);
    }
  };

  const handleDraft = async () => {
    if (!onDraftReply) return;
    try {
      const reply = await onDraftReply(lead.id);
      setLocalDraft(reply);
    } catch {
      // parent toasts
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-[hsl(var(--os-cyan)/0.3)] transition-all group flex flex-col">
      <div className="flex justify-between items-start mb-3 gap-2">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full w-fit ${statusColors[lead.status]}`}
            >
              {lead.status}
            </span>
            {leadType === "post" && (
              <Badge variant="secondary" className="text-[10px]">
                Live post
              </Badge>
            )}
            {intent && (
              <Badge variant="outline" className="text-[10px]">
                {INTENT_LABELS[intent] ?? intent}
              </Badge>
            )}
          </div>
          <h3 className="text-base font-semibold text-foreground group-hover:text-[hsl(var(--os-cyan))] transition-colors leading-snug">
            {lead.title}
          </h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {lead.url && (
            <a
              href={lead.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all"
              title="Open post"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={() => onDelete(lead.id)}
            className="p-2 text-muted-foreground hover:text-[hsl(var(--os-rose))] hover:bg-secondary rounded-lg transition-all"
            title="Delete Lead"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {author && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          {authorUrl ? (
            <a
              href={authorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:underline inline-flex items-center gap-1"
            >
              u/{author}
              <ArrowUpRight className="h-3 w-3" />
            </a>
          ) : (
            <span className="font-medium">u/{author}</span>
          )}
          <span className="text-muted-foreground text-xs">in {community}</span>
        </div>
      )}

      {postBody && leadType === "post" ? (
        <blockquote className="text-sm text-muted-foreground mb-3 rounded-lg border-l-2 border-primary/40 bg-muted/30 px-3 py-2 line-clamp-4 whitespace-pre-wrap">
          {postBody}
        </blockquote>
      ) : (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{lead.description}</p>
      )}

      {approach && (
        <p className="text-xs mb-3 rounded-md bg-[hsl(var(--os-cyan)/0.08)] text-foreground/90 px-2.5 py-2">
          <span className="font-semibold">Approach: </span>
          {approach}
        </p>
      )}

      {(leadType === "post" || Boolean(postBody) || Boolean(lead.url)) && onDraftReply && (
        <div className="mb-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={drafting}
              onClick={handleDraft}
            >
              {drafting ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 mr-1" />
              )}
              {draft ? "Regenerate reply" : "Draft reply"}
            </Button>
            {draft && (
              <Button
                size="sm"
                variant="outline"
                onClick={copyDraft}
                disabled={copying}
              >
                {copying ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Copy className="h-3.5 w-3.5 mr-1" />
                )}
                Copy & mark contacted
              </Button>
            )}
            {draft && lead.url && (
              <Button size="sm" variant="outline" asChild>
                <a href={lead.url} target="_blank" rel="noopener noreferrer">
                  Open thread
                </a>
              </Button>
            )}
          </div>
          {draft && (
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1.5">
                Ready to paste
              </p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{draft}</p>
              {(outreachCopiedAt || contactedAt) && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  Outreach logged{" "}
                  {new Date(outreachCopiedAt || contactedAt!).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[10px] text-muted-foreground">
            <p className="uppercase tracking-widest font-medium opacity-60">Source</p>
            <p className="font-semibold text-foreground capitalize">
              {platform || lead.source || "Unknown"}
            </p>
          </div>
          <div className="text-[10px] text-muted-foreground">
            <p className="uppercase tracking-widest font-medium opacity-60">Relevance</p>
            <p className="font-semibold text-foreground">{relevance}/10</p>
          </div>
          {(score != null || comments != null) && (
            <div className="text-[10px] text-muted-foreground flex items-end gap-2">
              {score != null && (
                <span className="font-semibold text-foreground" title="Upvotes / points">
                  ▲ {score}
                </span>
              )}
              {comments != null && (
                <span
                  className="font-semibold text-foreground inline-flex items-center gap-0.5"
                  title="Comments"
                >
                  <MessageSquare className="h-3 w-3" />
                  {comments}
                </span>
              )}
            </div>
          )}
          {postedAt && (
            <div className="text-[10px] text-muted-foreground">
              <p className="uppercase tracking-widest font-medium opacity-60">Posted</p>
              <p className="font-semibold text-foreground">
                {new Date(postedAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onPromote && !lead.project_id && (
            <button
              onClick={() => onPromote(lead.id)}
              disabled={promoting}
              className="p-1.5 rounded-md text-muted-foreground hover:text-[hsl(var(--os-emerald))] hover:bg-[hsl(var(--os-emerald)/0.1)] transition-all disabled:opacity-50"
              title="Promote to project"
            >
              <Rocket className="w-4 h-4" />
            </button>
          )}
          {lead.project_id && (
            <span className="text-[10px] text-[hsl(var(--os-emerald))] font-medium px-1">
              Linked
            </span>
          )}
          <button
            onClick={() => onStatusChange(lead.id, "qualified")}
            className={`p-1.5 rounded-md transition-all ${lead.status === "qualified" ? "bg-green-500/20 text-green-500" : "text-muted-foreground hover:bg-secondary"}`}
            title="Mark as Qualified"
          >
            <CheckCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => onStatusChange(lead.id, "contacted")}
            className={`p-1.5 rounded-md transition-all ${lead.status === "contacted" ? "bg-purple-500/20 text-purple-500" : "text-muted-foreground hover:bg-secondary"}`}
            title="Mark as Contacted"
          >
            <Clock className="w-4 h-4" />
          </button>
          <button
            onClick={() => onStatusChange(lead.id, "rejected")}
            className={`p-1.5 rounded-md transition-all ${lead.status === "rejected" ? "bg-red-500/20 text-red-500" : "text-muted-foreground hover:bg-secondary"}`}
            title="Mark as Rejected"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
