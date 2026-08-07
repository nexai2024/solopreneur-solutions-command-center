"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function getDashboardStats() {
  const user = await requireAuth();

  const [scoredIdeas, activeTasks, pipelineLeads, transactions, projects] =
    await Promise.all([
      prisma.idea.count({
        where: { userId: user.id, status: { in: ["scored", "promoted"] } },
      }),
      prisma.task.count({
        where: {
          project: { userId: user.id },
          status: { in: ["todo", "in-progress"] },
        },
      }),
      prisma.lead.count({
        where: { userId: user.id, status: { not: "lost" } },
      }),
      prisma.transaction.findMany({
        where: {
          userId: user.id,
          status: "succeeded",
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      prisma.project.count({ where: { userId: user.id } }),
    ]);

  const monthlyRevenue = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  const recentIdeas = await prisma.idea.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: { id: true, title: true, aiScore: true, status: true },
  });

  const projectsWithMilestones = await prisma.project.findMany({
    where: { userId: user.id },
    include: {
      milestones: { orderBy: { targetDate: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const allMilestones = projectsWithMilestones.flatMap((p) => p.milestones);
  const completedMilestones = allMilestones.filter((m) => m.isCompleted).length;

  const projectProgress = projectsWithMilestones
    .filter((p) => p.milestones.length > 0)
    .map((p) => {
      const completed = p.milestones.filter((m) => m.isCompleted).length;
      const next = p.milestones.find((m) => !m.isCompleted);
      return {
        projectId: p.id,
        projectName: p.name,
        total: p.milestones.length,
        completed,
        percent: Math.round((completed / p.milestones.length) * 100),
        nextMilestone: next
          ? { id: next.id, title: next.title, targetDate: next.targetDate.toISOString() }
          : null,
      };
    });

  const upcomingMilestones = allMilestones
    .filter((m) => !m.isCompleted)
    .sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime())
    .slice(0, 5)
    .map((m) => {
      const project = projectsWithMilestones.find((p) =>
        p.milestones.some((pm) => pm.id === m.id)
      );
      return {
        id: m.id,
        title: m.title,
        targetDate: m.targetDate.toISOString(),
        projectName: project?.name ?? "Unknown",
        projectId: m.projectId,
      };
    });

  return {
    scoredIdeas,
    activeTasks,
    pipelineLeads,
    monthlyRevenue,
    projectCount: projects,
    recentIdeas,
    milestones: {
      total: allMilestones.length,
      completed: completedMilestones,
      percent:
        allMilestones.length > 0
          ? Math.round((completedMilestones / allMilestones.length) * 100)
          : 0,
      projectProgress,
      upcoming: upcomingMilestones,
    },
  };
}

export async function getProjectsForUser() {
  const user = await requireAuth();
  return prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { tasks: true, milestones: true, ideas: true } },
    },
  });
}

export type TimelineEventType =
  | "idea"
  | "promote"
  | "milestone"
  | "lead"
  | "task"
  | "repo"
  | "campaign";

export type ProjectTimelineEvent = {
  id: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  timestamp: string;
  /** Deep link into the related product area */
  href?: string;
};

export type ProjectTimeline = {
  projectId: string;
  projectName: string;
  status: string;
  createdAt: string;
  idea: { id: string; title: string; aiScore: number | null; status: string } | null;
  stats: {
    tasksDone: number;
    tasksTotal: number;
    milestonesDone: number;
    milestonesTotal: number;
    leadsCount: number;
    hasRepo: boolean;
    campaignCount: number;
  };
  events: ProjectTimelineEvent[];
};

export async function getProjectTimelines(): Promise<ProjectTimeline[]> {
  const user = await requireAuth();

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      ideas: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { id: true, title: true, aiScore: true, status: true, updatedAt: true, createdAt: true },
      },
      tasks: { select: { id: true, title: true, status: true, createdAt: true } },
      milestones: { orderBy: { targetDate: "asc" } },
      leads: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, title: true, status: true, createdAt: true },
      },
      _count: { select: { leads: true } },
      githubConnection: { select: { repoUrl: true, createdAt: true } },
    },
  });

  const projectIds = projects.map((p) => p.id);
  const campaigns =
    projectIds.length > 0
      ? await prisma.marketingCampaign.findMany({
          where: { userId: user.id, projectId: { in: projectIds } },
          orderBy: { createdAt: "desc" },
          select: { id: true, title: true, projectId: true, status: true, budget: true, createdAt: true },
        })
      : [];

  const campaignsByProject = new Map<string, typeof campaigns>();
  for (const c of campaigns) {
    if (!c.projectId) continue;
    const list = campaignsByProject.get(c.projectId) ?? [];
    list.push(c);
    campaignsByProject.set(c.projectId, list);
  }

  return projects.map((project) => {
    const idea = project.ideas[0] ?? null;
    const tasksDone = project.tasks.filter((t) => t.status === "done").length;
    const milestonesDone = project.milestones.filter((m) => m.isCompleted).length;
    const nextMilestone = project.milestones.find((m) => !m.isCompleted);
    const projectCampaigns = campaignsByProject.get(project.id) ?? [];

    const events: ProjectTimelineEvent[] = [];

    const buildHref = (tab: "tasks" | "builds" | "repository" | "profile" = "tasks") =>
      `/dashboard/build-tracker?projectId=${project.id}&tab=${tab}`;
    const growthCampaignsHref = `/dashboard/growth-engine?projectId=${project.id}&tab=campaigns`;
    const leadsHref = `/dashboard/lead-finder`;
    const brainstormHref = `/dashboard/brainstorm`;
    const repoHref = `/dashboard/repository?projectId=${project.id}`;

    if (idea) {
      events.push({
        id: `idea-${idea.id}`,
        type: "idea",
        title: idea.aiScore != null ? `Idea scored: ${idea.title}` : `Idea captured: ${idea.title}`,
        description:
          idea.aiScore != null
            ? `AI score ${idea.aiScore.toFixed(1)} · ${idea.status}`
            : idea.status,
        timestamp: idea.updatedAt.toISOString(),
        href: brainstormHref,
      });
    }

    events.push({
      id: `promote-${project.id}`,
      type: "promote",
      title: `Project launched: ${project.name}`,
      description: project.description?.slice(0, 120) ?? undefined,
      timestamp: project.createdAt.toISOString(),
      href: buildHref("tasks"),
    });

    for (const lead of project.leads) {
      events.push({
        id: `lead-${lead.id}`,
        type: "lead",
        title: `Lead added: ${lead.title}`,
        description: lead.status,
        timestamp: lead.createdAt.toISOString(),
        href: leadsHref,
      });
    }

    if (project.githubConnection) {
      events.push({
        id: `repo-${project.id}`,
        type: "repo",
        title: "Repository linked",
        description: project.githubConnection.repoUrl,
        timestamp: project.githubConnection.createdAt.toISOString(),
        href: repoHref,
      });
    } else if (project.repoUrl) {
      events.push({
        id: `repo-${project.id}`,
        type: "repo",
        title: "Repository linked",
        description: project.repoUrl,
        timestamp: project.updatedAt.toISOString(),
        href: repoHref,
      });
    }

    for (const campaign of projectCampaigns) {
      events.push({
        id: `campaign-${campaign.id}`,
        type: "campaign",
        title: `Campaign: ${campaign.title}`,
        description: `${campaign.status} · $${campaign.budget} budget`,
        timestamp: campaign.createdAt.toISOString(),
        href: growthCampaignsHref,
      });
    }

    for (const milestone of project.milestones.filter((m) => m.isCompleted)) {
      events.push({
        id: `milestone-${milestone.id}`,
        type: "milestone",
        title: `Milestone completed: ${milestone.title}`,
        timestamp: milestone.targetDate.toISOString(),
        href: buildHref("tasks"),
      });
    }

    if (nextMilestone) {
      events.push({
        id: `milestone-next-${nextMilestone.id}`,
        type: "milestone",
        title: `Up next: ${nextMilestone.title}`,
        description: `Due ${nextMilestone.targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        timestamp: nextMilestone.targetDate.toISOString(),
        href: buildHref("tasks"),
      });
    }

    const recentDoneTasks = project.tasks
      .filter((t) => t.status === "done")
      .slice(0, 3);
    for (const task of recentDoneTasks) {
      events.push({
        id: `task-${task.id}`,
        type: "task",
        title: `Task completed: ${task.title}`,
        timestamp: task.createdAt.toISOString(),
        href: buildHref("tasks"),
      });
    }

    if (tasksDone > 0) {
      events.push({
        id: `task-summary-${project.id}`,
        type: "task",
        title: `${tasksDone}/${project.tasks.length} tasks done`,
        description:
          project.tasks.length - tasksDone > 0
            ? `${project.tasks.length - tasksDone} remaining`
            : "All tasks complete",
        timestamp: project.updatedAt.toISOString(),
        href: buildHref("tasks"),
      });
    }

    events.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return {
      projectId: project.id,
      projectName: project.name,
      status: project.status,
      createdAt: project.createdAt.toISOString(),
      idea: idea
        ? {
            id: idea.id,
            title: idea.title,
            aiScore: idea.aiScore,
            status: idea.status,
          }
        : null,
      stats: {
        tasksDone,
        tasksTotal: project.tasks.length,
        milestonesDone,
        milestonesTotal: project.milestones.length,
        leadsCount: project._count.leads,
        hasRepo: !!(project.repoUrl ?? project.githubConnection),
        campaignCount: projectCampaigns.length,
      },
      events,
    };
  });
}
