"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Rocket, Sparkles, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GrowthCoachPanel } from "@/components/growth-engine/growth-coach-panel";
import { ContentCalendarBoard } from "@/components/growth-engine/content-calendar-board";
import { LaunchPlaybooksPanel } from "@/components/growth-engine/launch-playbooks-panel";
import { CampaignsPanel } from "@/components/growth-engine/campaigns-panel";
import { BrandVoicePanel } from "@/components/growth-engine/brand-voice-panel";
import { HowDoILink } from "@/components/help/how-do-i-link";
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

export function GrowthEngineWorkspace({ projects }: { projects: ProjectOption[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialProject =
    searchParams.get("projectId") ?? projects[0]?.id ?? "";
  const launchFlag = searchParams.get("launch") === "1";
  const releaseId = searchParams.get("releaseId");
  const version = searchParams.get("version");

  const [selectedId, setSelectedId] = useState(initialProject);
  const [tab, setTab] = useState(launchFlag ? "coach" : "coach");
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
        router.replace(`/dashboard/growth-engine?projectId=${selectedId}`);
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
          <Button size="sm" variant="outline" onClick={() => setTab("playbooks")}>
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
            onClick={() => {
              setSelectedId(p.id);
              setLaunchMode(false);
              router.replace(`/dashboard/growth-engine?projectId=${p.id}`);
            }}
          >
            {p.name}
          </Button>
        ))}
      </div>

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="coach">Growth Coach</TabsTrigger>
            <TabsTrigger value="calendar">Content Calendar</TabsTrigger>
            <TabsTrigger value="playbooks">Launch Playbooks</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
          </TabsList>

          <TabsContent value="coach" className="mt-6 space-y-6">
            <GrowthCoachPanel
              projectId={selectedId}
              plan={plan}
              launchMode={launchMode}
              onPlanChange={setPlan}
            />
            <BrandVoicePanel
              key={`${selectedId}-${brandVoice.audience ?? ""}-${brandVoice.tone.join(",")}`}
              projectId={selectedId}
              initial={brandVoice}
            />
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <ContentCalendarBoard
              projectId={selectedId}
              items={content}
              onItemsChange={setContent}
            />
          </TabsContent>

          <TabsContent value="playbooks" className="mt-6">
            <LaunchPlaybooksPanel
              projectId={selectedId}
              playbooks={playbooks}
              onChange={setPlaybooks}
            />
          </TabsContent>

          <TabsContent value="campaigns" className="mt-6">
            <CampaignsPanel
              projectId={selectedId}
              campaigns={campaigns}
              onChange={setCampaigns}
            />
          </TabsContent>

          <TabsContent value="seo" className="mt-6 space-y-4">
            <div className="flex gap-2">
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
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
