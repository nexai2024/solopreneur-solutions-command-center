export type PlaybookStep = {
  id: string;
  title: string;
  description: string;
  dayOffset: number;
  copyKey?: string;
};

export type LaunchPlaybookDef = {
  id: string;
  name: string;
  description: string;
  url: string;
  steps: PlaybookStep[];
};

export const LAUNCH_PLAYBOOKS: LaunchPlaybookDef[] = [
  {
    id: "product-hunt",
    name: "Product Hunt",
    description: "Timed launch day playbook with hunter prep, assets, and follow-up.",
    url: "https://www.producthunt.com/",
    steps: [
      {
        id: "ph-assets",
        title: "Prepare gallery + tagline",
        description: "Thumbnail, 3–5 gallery images, and a sharp tagline under 60 chars.",
        dayOffset: -7,
        copyKey: "tagline",
      },
      {
        id: "ph-first-comment",
        title: "Write maker first comment",
        description: "Story, who it's for, and a clear CTA for the first comment.",
        dayOffset: -3,
        copyKey: "firstComment",
      },
      {
        id: "ph-hunter",
        title: "Confirm hunter / schedule",
        description: "Lock launch day and timezone; brief supporters the day before.",
        dayOffset: -1,
      },
      {
        id: "ph-launch",
        title: "Go live + engage",
        description: "Reply to every comment in the first 4 hours.",
        dayOffset: 0,
        copyKey: "launchPost",
      },
      {
        id: "ph-followup",
        title: "Day-after follow-up",
        description: "Thank voters, share results, and capture feedback themes.",
        dayOffset: 1,
        copyKey: "followUp",
      },
    ],
  },
  {
    id: "indie-hackers",
    name: "Indie Hackers",
    description: "Milestone storytelling for founders who want feedback and early users.",
    url: "https://www.indiehackers.com/",
    steps: [
      {
        id: "ih-milestone",
        title: "Draft milestone post",
        description: "What you shipped, metrics, and one honest lesson.",
        dayOffset: -2,
        copyKey: "milestonePost",
      },
      {
        id: "ih-engage",
        title: "Engage 5 related threads",
        description: "Helpful comments in nearby discussions before posting yours.",
        dayOffset: -1,
      },
      {
        id: "ih-publish",
        title: "Publish + reply",
        description: "Post during US morning; reply to every comment same day.",
        dayOffset: 0,
        copyKey: "milestonePost",
      },
    ],
  },
  {
    id: "reddit",
    name: "Reddit",
    description: "Value-first posts for r/SideProject, r/SaaS, and niche communities.",
    url: "https://www.reddit.com/r/SideProject/",
    steps: [
      {
        id: "rd-rules",
        title: "Check subreddit rules",
        description: "Confirm self-promo rules and best flair before drafting.",
        dayOffset: -3,
      },
      {
        id: "rd-draft",
        title: "Write non-spammy draft",
        description: "Lead with problem + solution story; soft CTA at the end.",
        dayOffset: -1,
        copyKey: "redditPost",
      },
      {
        id: "rd-post",
        title: "Post + stay for AMA",
        description: "Stay online 90 minutes after posting to answer questions.",
        dayOffset: 0,
        copyKey: "redditPost",
      },
    ],
  },
  {
    id: "directories",
    name: "Directories & launch lists",
    description: "Track submissions to directories and launch newsletters.",
    url: "https://www.launchingnext.com/",
    steps: [
      {
        id: "dir-list",
        title: "Pick 8 directories",
        description: "Choose relevant SaaS/tools directories for your niche.",
        dayOffset: -5,
      },
      {
        id: "dir-assets",
        title: "Reuse one-liner + screenshots",
        description: "Keep description and CTA consistent across submissions.",
        dayOffset: -3,
        copyKey: "directoryBlurb",
      },
      {
        id: "dir-submit",
        title: "Submit and log status",
        description: "Submit, note pending/approved, and follow up once.",
        dayOffset: 0,
      },
    ],
  },
  {
    id: "linkedin-x",
    name: "LinkedIn + X launch week",
    description: "Build-in-public sequence for personal brand distribution.",
    url: "https://www.linkedin.com/",
    steps: [
      {
        id: "soc-teaser",
        title: "Teaser post",
        description: "Problem teaser 3 days out — no hard sell.",
        dayOffset: -3,
        copyKey: "teaser",
      },
      {
        id: "soc-launch",
        title: "Launch day thread/post",
        description: "Ship announcement with proof + clear CTA.",
        dayOffset: 0,
        copyKey: "launchSocial",
      },
      {
        id: "soc-proof",
        title: "Social proof follow-up",
        description: "Share a win, quote, or lesson within 48 hours.",
        dayOffset: 2,
        copyKey: "proofFollowUp",
      },
    ],
  },
];

export function getPlaybook(id: string): LaunchPlaybookDef | undefined {
  return LAUNCH_PLAYBOOKS.find((p) => p.id === id);
}

export function emptyChecklist(playbookId: string): Record<string, boolean> {
  const playbook = getPlaybook(playbookId);
  if (!playbook) return {};
  return Object.fromEntries(playbook.steps.map((s) => [s.id, false]));
}
