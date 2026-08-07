"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarDays,
  Loader2,
  Megaphone,
  Plus,
  Rocket,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GrowthCoachPanel } from "@/components/growth-engine/growth-coach-panel";
import { ContentCalendarBoard } from "@/components/growth-engine/content-calendar-board";
import { LaunchPlaybooksPanel } from "@/components/growth-engine/launch-playbooks-panel";
import { CampaignsPanel } from "@/components/growth-engine/campaigns-panel";
import { BrandVoicePanel } from "@/components/growth-engine/brand-voice-panel";
import { HowDoILink } from "@/components/help/how-do-i-link";
import { CollapsibleWidget } from "@/components/dashboard/collapsible-widget";
import {
  addKeyword,
  deleteKeyword,
  getBrandVoice,
  getContentItems,
  getGrowthCampaigns,
  getKeywords,
  getLaunchPlaybooks,
  getWeeklyGrowthPlan,
  startLaunchMode,
  suggestKeywordsForProject,
  type BrandVoiceDTO,
  type ContentItemDTO,
  type GrowthCampaignDTO,
  type GrowthPlanDTO,
  type LaunchPlaybookDTO,
  type SeoKeywordDTO,
} from "@/lib/actions/growth";

type ProjectOption = {
  id: string;
  name: string;
  description: string | null;
};

const GROWTH_TABS = [
  "coach",
  "calendar",
  "playbooks",
  "campaigns",
  "seo",
] as const;

export type GrowthTab = (typeof GROWTH_TABS)[number];

function parseGrowthTab(value: string | null | undefined): GrowthTab | null {
  if (value && (GROWTH_TABS as readonly string[]).includes(value)) {
    return value as GrowthTab;
  }
  return null;
}

function buildGrowthUrl(
  projectId: string,
  tab: GrowthTab,
  extras?: { launch?: boolean; releaseId?: string | null; version?: string | null }
) {
  const params = new URLSearchParams();
  if (projectId) params.set("projectId", projectId);
  if (tab !== "coach") params.set("tab", tab);
  if (extras?.launch) {
    params.set("launch", "1");
    if (extras.releaseId) params.set("releaseId", extras.releaseId);
    if (extras.version) params.set("version", extras.version);
  }
  const qs = params.toString();
  return qs ? `/dashboard/growth-engine?${qs}` : "/dashboard/growth-engine";
}

export function GrowthEngineWorkspace({ projects }: { projects: ProjectOption[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const projectParam = searchParams.get("projectId");
  const tabParam = parseGrowthTab(searchParams.get("tab"));
  const launchFlag = searchParams.get("launch") === "1";
  const releaseId = searchParams.get("releaseId");
  const version = searchParams.get("version");

  const initialProject =
    (projectParam && projects.some((p) => p.id === projectParam) && projectParam) ||
    projects[0]?.id ||
    "";

  const [selectedId, setSelectedId] = useState(initialProject);
  const [tab, setTab] = useState<GrowthTab>(
    tabParam ?? (launchFlag ? "playbooks" : "coach")
  );
  const [keywords, setKeywords] = useState<SeoKeywordDTO[]>([]);
  const [content, setContent] = useState<ContentItemDTO[]>([]);
  const [plan, setPlan] = useState<GrowthPlanDTO | null>(null);
  const [playbooks, setPlaybooks] = useState<LaunchPlaybookDTO[]>([]);
  const [campaigns, setCampaigns] = useState<GrowthCampaignDTO[]>([]);
  const [brandVoice, setBrandVoice] = useState<BrandVoiceDTO>({
    tone: [],
    avoid: [],
    audience: null,
  });
  const [newKeyword, setNewKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [launchMode, setLaunchMode] = useState(launchFlag);
  const [isPending, startTransition] = useTransition();
  const launchStarted = useRef(false);

  const syncUrl = (projectId: string, nextTab: GrowthTab) => {
    router.replace(buildGrowthUrl(projectId, nextTab), { scroll: false });
  };

  const selectProject = (projectId: string) => {
    setSelectedId(projectId);
    setLaunchMode(false);
    syncUrl(projectId, tab);
  };

  const selectTab = (next: string) => {
    const nextTab = parseGrowthTab(next) ?? "coach";
    setTab(nextTab);
    if (selectedId) syncUrl(selectedId, nextTab);
  };

  useEffect(() => {
    if (projectParam && projects.some((p) => p.id === projectParam)) {
      setSelectedId(projectParam);
    }
  }, [projectParam, projects]);

  useEffect(() => {
    if (tabParam) setTab(tabParam);
  }, [tabParam]);

  useEffect(() => {
    if (launchFlag) setLaunchMode(true);
  }, [launchFlag]);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    Promise.all([
      getKeywords(selectedId),
      getContentItems(selectedId),
      getWeeklyGrowthPlan(selectedId),
      getLaunchPlaybooks(selectedId),
      getGrowthCampaigns(selectedId),
      getBrandVoice(selectedId),
    ])
      .then(([kw, items, weekly, pb, camps, voice]) => {
        setKeywords(kw);
        setContent(items);
        setPlan(weekly);
        setPlaybooks(pb);
        setCampaigns(camps);
        setBrandVoice(voice);
      })
      .catch(() => toast.error("Failed to load growth data"))
      .finally(() => setLoading(false));
  }, [selectedId]);

  useEffect(() => {
    if (!launchFlag || !selectedId || launchStarted.current) return;
    launchStarted.current = true;
    startTransition(async () => {
      try {
        const result = await startLaunchMode(selectedId, {
          buildReleaseId: releaseId,
          version,
        });
        setPlan(result.plan);
        setPlaybooks(await getLaunchPlaybooks(selectedId));
        setLaunchMode(true);
        setTab("playbooks");
        toast.success("Launch Mode activated — playbooks + coach ready");
        router.replace(buildGrowthUrl(selectedId, "playbooks"), { scroll: false });
      } catch {
        toast.error("Failed to start Launch Mode");
      }
    });
  }, [launchFlag, selectedId, releaseId, version, router]);

  if (projects.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Create a project first by promoting an idea from Brainstorm.
        </p>
        <HowDoILink section="growth-engine" />
      </div>
    );
  }

  const selectedName = projects.find((p) => p.id === selectedId)?.name;

  return (
    <div className="space-y-6">
      {launchMode && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Rocket className="h-4 w-4 text-primary" />
            <span className="font-medium">Launch Mode</span>
            <span className="text-muted-foreground">
              Coach + playbooks tuned for shipping
              {version ? ` ${version}` : ""}.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => selectTab("playbooks")}
          >
            Open playbooks
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {projects.map((p) => (
          <Button
            key={p.id}
            size="sm"
            variant={p.id === selectedId ? "default" : "outline"}
            onClick={() => selectProject(p.id)}
          >
            {p.name}
          </Button>
        ))}
      </div>

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Tabs value={tab} onValueChange={selectTab}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="coach">Growth Coach</TabsTrigger>
            <TabsTrigger value="calendar">Content Calendar</TabsTrigger>
            <TabsTrigger value="playbooks">Launch Playbooks</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
          </TabsList>

          <TabsContent value="coach" className="mt-6 space-y-4">
            <CollapsibleWidget
              id={`growth-coach-${selectedId}`}
              title={
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Growth Coach
                  {selectedName ? (
                    <span className="text-sm font-normal text-muted-foreground">
                      · {selectedName}
                    </span>
                  ) : null}
                </span>
              }
              collapsedSummary={
                plan
                  ? `${plan.actions.filter((a) => a.done).length}/${plan.actions.length} actions done this week`
                  : "No plan yet — expand to generate"
              }
            >
              <GrowthCoachPanel
                projectId={selectedId}
                plan={plan}
                launchMode={launchMode}
                onPlanChange={setPlan}
              />
            </CollapsibleWidget>

            <CollapsibleWidget
              id={`growth-brand-voice-${selectedId}`}
              title="Brand voice"
              defaultOpen={false}
              collapsedSummary={
                brandVoice.tone.length > 0 || brandVoice.audience
                  ? `${brandVoice.tone.slice(0, 3).join(", ") || "Custom"}${
                      brandVoice.audience ? ` · ${brandVoice.audience}` : ""
                    }`
                  : "Not set — used for rewrites and lead replies"
              }
            >
              <BrandVoicePanel
                key={`${selectedId}-${brandVoice.audience ?? ""}-${brandVoice.tone.join(",")}`}
                projectId={selectedId}
                initial={brandVoice}
              />
            </CollapsibleWidget>
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <CollapsibleWidget
              id={`growth-calendar-${selectedId}`}
              title={
                <span className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Content Calendar
                </span>
              }
              collapsedSummary={
                content.length === 0
                  ? "No content yet"
                  : `${content.length} item${content.length !== 1 ? "s" : ""}`
              }
            >
              <ContentCalendarBoard
                projectId={selectedId}
                items={content}
                onItemsChange={setContent}
              />
            </CollapsibleWidget>
          </TabsContent>

          <TabsContent value="playbooks" className="mt-6">
            <CollapsibleWidget
              id={`growth-playbooks-${selectedId}`}
              title={
                <span className="flex items-center gap-2">
                  <Rocket className="h-5 w-5" />
                  Launch Playbooks
                </span>
              }
              collapsedSummary={
                playbooks.length === 0
                  ? "No playbooks activated"
                  : `${playbooks.filter((p) => p.status === "active").length} active · ${playbooks.length} total`
              }
            >
              <LaunchPlaybooksPanel
                projectId={selectedId}
                playbooks={playbooks}
                onChange={setPlaybooks}
              />
            </CollapsibleWidget>
          </TabsContent>

          <TabsContent value="campaigns" className="mt-6">
            <CollapsibleWidget
              id={`growth-campaigns-${selectedId}`}
              title={
                <span className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5" />
                  Campaigns
                </span>
              }
              collapsedSummary={
                campaigns.length === 0
                  ? "No campaigns yet"
                  : `${campaigns.length} campaign${campaigns.length !== 1 ? "s" : ""}`
              }
            >
              <CampaignsPanel
                projectId={selectedId}
                campaigns={campaigns}
                onChange={setCampaigns}
              />
            </CollapsibleWidget>
          </TabsContent>

          <TabsContent value="seo" className="mt-6">
            <CollapsibleWidget
              id={`growth-seo-${selectedId}`}
              title={
                <span className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  SEO keywords
                </span>
              }
              collapsedSummary={
                keywords.length === 0
                  ? "No keywords yet"
                  : `${keywords.length} keyword${keywords.length !== 1 ? "s" : ""}`
              }
            >
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Input
                    placeholder="Add keyword..."
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button
                    size="sm"
                    disabled={!newKeyword.trim() || isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await addKeyword(selectedId, newKeyword);
                        setKeywords(await getKeywords(selectedId));
                        setNewKeyword("");
                      })
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const n = await suggestKeywordsForProject(selectedId);
                        setKeywords(await getKeywords(selectedId));
                        toast.success(`Added ${n} keywords`);
                      })
                    }
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    AI Suggest
                  </Button>
                </div>
                <ul className="space-y-2">
                  {keywords.map((kw) => (
                    <li
                      key={kw.id}
                      className="flex items-center justify-between rounded-lg border p-3 text-sm"
                    >
                      <div>
                        <span className="font-medium">{kw.keyword}</span>
                        <span className="text-muted-foreground ml-3 text-xs">
                          Vol: {kw.search_volume} · Diff: {kw.difficulty}
                        </span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          startTransition(async () => {
                            await deleteKeyword(kw.id);
                            setKeywords(await getKeywords(selectedId));
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                  {keywords.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        No keywords yet. Use AI Suggest to seed research.
                      </p>
                      <HowDoILink section="growth-engine" />
                    </div>
                  )}
                </ul>
              </div>
            </CollapsibleWidget>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
