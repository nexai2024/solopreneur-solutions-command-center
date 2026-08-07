"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GitBranch, Lightbulb, Rocket, Target, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BoardTask } from "@/lib/task-types";
import { MilestoneChecklist } from "@/components/milestones/milestone-checklist";
import { NewProjectButton, ProjectToolbar } from "@/components/build-tracker/project-toolbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BuildPipelineBoard } from "@/components/build-tracker/build-pipeline-board";
import { BuildReleaseManager } from "@/components/build-tracker/build-release-manager";
import { ProjectRepoSection } from "@/components/build-tracker/project-repo-section";
import { ProjectProfileSection } from "@/components/build-tracker/project-profile-section";
import { TaskKanbanBoard } from "@/components/build-tracker/task-kanban-board";
import type { BuildReleaseDTO } from "@/lib/actions/build-library";
import type { ProjectProfileDTO } from "@/lib/actions/project-profile";
import type { RepoMonitoringSnapshot } from "@/lib/actions/repo-monitoring";
import {
  canDeleteBuilds,
  canUploadBuilds,
  type UserRole,
} from "@/lib/build-rbac";
import { HowDoILink } from "@/components/help/how-do-i-link";

const BUILD_TABS = ["tasks", "builds", "repository", "profile"] as const;
type BuildTab = (typeof BUILD_TABS)[number];

function parseBuildTab(value: string | undefined): BuildTab {
  if (value && (BUILD_TABS as readonly string[]).includes(value)) {
    return value as BuildTab;
  }
  return "tasks";
}

export type BoardMilestone = {
  id: string;
  title: string;
  targetDate: string;
  isCompleted: boolean;
};

export type { BoardTask };

export type BoardIdea = {
  id: string;
  title: string;
  aiScore: number | null;
  status: string;
};

export type BoardLead = {
  id: string;
  title: string;
  status: string;
};

export type BoardProject = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  repoUrl: string | null;
  githubConnection: {
    repoUrl: string;
    provider: string;
    repoFullName: string | null;
  } | null;
  tasks: BoardTask[];
  milestones: BoardMilestone[];
  ideas: BoardIdea[];
  leads: BoardLead[];
  builds: BuildReleaseDTO[];
  buildMetrics: {
    totalBuilds: number;
    successRate: number | null;
    failedCount: number;
    avgBuildTimeSec: number | null;
    recentVelocity: number;
  };
  monitoring: RepoMonitoringSnapshot | null;
  profile: ProjectProfileDTO;
  _count: { tasks: number; milestones: number; ideas: number; leads: number };
};

export function BuildTracker({
  projects: initialProjects,
  userRole = "admin",
  initialProjectId,
  initialTab,
}: {
  projects: BoardProject[];
  userRole?: UserRole;
  initialProjectId?: string;
  initialTab?: string;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const resolvedInitialId =
    (initialProjectId &&
      initialProjects.some((p) => p.id === initialProjectId) &&
      initialProjectId) ||
    initialProjects[0]?.id ||
    "";
  const [selectedId, setSelectedId] = useState(resolvedInitialId);
  const [tab, setTab] = useState<BuildTab>(parseBuildTab(initialTab));
  const role = userRole;
  const canUpload = canUploadBuilds(role);
  const canDelete = canDeleteBuilds(role);
  const canDragPipeline = role === "admin" || role === "dev" || role === "qa";

  useEffect(() => {
    if (initialProjectId && projects.some((p) => p.id === initialProjectId)) {
      setSelectedId(initialProjectId);
    }
  }, [initialProjectId, projects]);

  useEffect(() => {
    if (initialTab) setTab(parseBuildTab(initialTab));
  }, [initialTab]);

  const syncUrl = (projectId: string, nextTab: BuildTab) => {
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    if (nextTab !== "tasks") params.set("tab", nextTab);
    const qs = params.toString();
    router.replace(qs ? `/dashboard/build-tracker?${qs}` : "/dashboard/build-tracker", {
      scroll: false,
    });
  };

  const selectProject = (projectId: string) => {
    setSelectedId(projectId);
    syncUrl(projectId, tab);
  };

  const selectTab = (next: string) => {
    const nextTab = parseBuildTab(next);
    setTab(nextTab);
    if (selectedId) syncUrl(selectedId, nextTab);
  };

  const selected = projects.find((p) => p.id === selectedId) ?? projects[0];

  const launchReadyBuild = useMemo(() => {
    if (!selected) return null;
    const candidates = selected.builds.filter((b) =>
      ["approved", "released", "success"].includes(b.pipelineStatus)
    );
    return (
      candidates.find((b) => b.pipelineStatus === "approved") ??
      candidates.find((b) => b.pipelineStatus === "released") ??
      candidates[0] ??
      null
    );
  }, [selected]);

  const handleTasksChange = (projectId: string, tasks: BoardTask[]) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, tasks, _count: { ...p._count, tasks: tasks.length } }
          : p
      )
    );
  };

  const handleProjectDeleted = (projectId: string) => {
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== projectId);
      if (selectedId === projectId) {
        setSelectedId(next[0]?.id ?? "");
      }
      return next;
    });
  };

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <p className="text-sm text-muted-foreground">No projects yet.</p>
        <HowDoILink section="build-tracker" />
        <NewProjectButton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {projects.map((project) => (
          <Button
            key={project.id}
            variant={project.id === selected?.id ? "default" : "outline"}
            size="sm"
            onClick={() => selectProject(project.id)}
          >
            {project.name}
            {project.githubConnection && (
              <GitBranch className="h-3 w-3 ml-1 opacity-70" />
            )}
            <Badge variant="secondary" className="ml-2">
              {project._count.tasks}
            </Badge>
          </Button>
        ))}
        <NewProjectButton />
      </div>

      {selected && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <CardTitle>{selected.name}</CardTitle>
                {selected.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-3 whitespace-pre-line">
                    {selected.description}
                  </p>
                )}
                {(selected.ideas.length > 0 || selected.leads.length > 0) && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selected.ideas.map((idea) => (
                      <Link key={idea.id} href="/dashboard/brainstorm">
                        <Badge variant="secondary" className="gap-1 hover:bg-secondary/80">
                          <Lightbulb className="h-3 w-3" />
                          {idea.title}
                          {idea.aiScore != null && (
                            <span className="opacity-70">· {Math.round(idea.aiScore)}</span>
                          )}
                        </Badge>
                      </Link>
                    ))}
                    {selected.leads.map((lead) => (
                      <Link key={lead.id} href="/dashboard/lead-finder">
                        <Badge variant="outline" className="gap-1 hover:bg-accent">
                          <Users className="h-3 w-3" />
                          {lead.title}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {launchReadyBuild && (
                  <Button size="sm" asChild>
                    <Link
                      href={`/dashboard/growth-engine?projectId=${selected.id}&launch=1&releaseId=${launchReadyBuild.id}&version=${encodeURIComponent(launchReadyBuild.version)}`}
                    >
                      <Rocket className="h-4 w-4 mr-1" />
                      Launch Mode
                    </Link>
                  </Button>
                )}
                <Badge variant="outline" className="capitalize">
                  {selected.status}
                </Badge>
                <ProjectToolbar
                  projectId={selected.id}
                  name={selected.name}
                  description={selected.description}
                  status={selected.status}
                  onDeleted={() => handleProjectDeleted(selected.id)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={tab} onValueChange={selectTab}>
              <TabsList className="flex flex-wrap h-auto gap-1">
                <TabsTrigger value="tasks">Tasks & milestones</TabsTrigger>
                <TabsTrigger value="builds">Builds & releases</TabsTrigger>
                <TabsTrigger value="repository">Repository & CI</TabsTrigger>
                <TabsTrigger value="profile">Project profile</TabsTrigger>
              </TabsList>

              <TabsContent value="tasks" className="space-y-8 mt-6">
                {selected.milestones.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Launch milestones
                    </h3>
                    <MilestoneChecklist milestones={selected.milestones} compact />
                  </div>
                )}
                <TaskKanbanBoard
                  key={selected.id}
                  projectId={selected.id}
                  initialTasks={selected.tasks}
                  onTasksChange={(tasks) => handleTasksChange(selected.id, tasks)}
                />
              </TabsContent>

              <TabsContent value="builds" className="space-y-6 mt-6">
                {launchReadyBuild && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm">
                      <p className="font-medium flex items-center gap-2">
                        <Rocket className="h-4 w-4" />
                        Ready to market v{launchReadyBuild.version}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Open Launch Mode to activate Growth Coach + distribution playbooks.
                      </p>
                    </div>
                    <Button size="sm" asChild>
                      <Link
                        href={`/dashboard/growth-engine?projectId=${selected.id}&launch=1&releaseId=${launchReadyBuild.id}&version=${encodeURIComponent(launchReadyBuild.version)}`}
                      >
                        Enter Launch Mode
                      </Link>
                    </Button>
                  </div>
                )}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Status pipeline</h3>
                  <p className="text-xs text-muted-foreground">
                    Drag builds between stages (role: {role}). GitHub webhooks auto-create
                    entries when CI runs.
                  </p>
                  <BuildPipelineBoard
                    builds={selected.builds}
                    canDrag={canDragPipeline}
                  />
                </div>
                <BuildReleaseManager
                  projectId={selected.id}
                  projectName={selected.name}
                  builds={selected.builds}
                  canUpload={canUpload}
                  canDelete={canDelete}
                  metrics={selected.buildMetrics}
                />
              </TabsContent>

              <TabsContent value="repository" className="mt-6">
                <ProjectRepoSection
                  projectId={selected.id}
                  projectName={selected.name}
                  repoUrl={selected.repoUrl}
                  githubConnection={selected.githubConnection}
                  monitoring={selected.monitoring}
                />
              </TabsContent>

              <TabsContent value="profile" className="mt-6">
                <ProjectProfileSection
                  projectId={selected.id}
                  projectName={selected.name}
                  profile={selected.profile}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
