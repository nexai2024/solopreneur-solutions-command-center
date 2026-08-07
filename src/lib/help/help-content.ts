export type HelpBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "steps"; items: string[] }
  | { type: "table"; headers: [string, string]; rows: [string, string][] }
  | { type: "callout"; text: string };

export type HelpSection = {
  id: string;
  title: string;
  /** Optional link into the live feature area */
  openHref?: string;
  openLabel?: string;
  blocks: HelpBlock[];
};

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: "what-is",
    title: "What is Solopreneur OS?",
    blocks: [
      {
        type: "paragraph",
        text: "Solopreneur OS is your all-in-one command center for running a solo product business—from ideas through build, leads, growth, and revenue.",
      },
      {
        type: "table",
        headers: ["Stage", "What you do here"],
        rows: [
          ["Ideas", "Capture and score ideas"],
          ["Build", "Track tasks, milestones, and releases"],
          ["Leads", "Find people talking about problems you solve"],
          ["Growth", "Plan content, launches, and campaigns"],
          ["Revenue", "See subscriptions and earnings"],
          ["Code", "Link GitHub and watch builds"],
        ],
      },
      {
        type: "paragraph",
        text: "You work around projects. An idea or lead can be promoted into a project, which then shows up in Build Tracker, Growth Engine, and related areas.",
      },
    ],
  },
  {
    id: "getting-started",
    title: "Getting started & how to access",
    blocks: [
      {
        type: "steps",
        items: [
          "Go to the Solopreneur OS home page.",
          "Click Sign in or Get started.",
          "Complete sign-in in the secure login window.",
          "Click Open Dashboard or Go to Command Center.",
        ],
      },
      {
        type: "paragraph",
        text: "You must be signed in to use the dashboard. Privacy and Terms are available without signing in (links in the sidebar footer).",
      },
      {
        type: "table",
        headers: ["Menu item", "What it’s for"],
        rows: [
          ["Overview", "Big-picture summary of your pipeline"],
          ["Brainstorm & Ideas", "Capture, score, and promote ideas"],
          ["Build Tracker", "Projects, tasks, milestones, builds"],
          ["Lead Finder", "Find and manage outreach leads"],
          ["Growth Engine", "Coach, content, launch playbooks, SEO"],
          ["Revenue & Billing", "MRR, subscriptions, transactions"],
          ["Repository & VCS", "Connect GitHub and monitor activity"],
          ["Settings", "Account, data export/delete, usage limits"],
          ["Help", "This guide—always available in the product"],
        ],
      },
    ],
  },
  {
    id: "navigation",
    title: "Finding your way around",
    blocks: [
      {
        type: "list",
        items: [
          "One sidebar for everything — you rarely need to leave the dashboard.",
          "Projects are the hub — after you promote an idea (or create a project), select that project in Build Tracker, Growth Engine, and Repository.",
          "AI buttons (Score, Generate, Draft reply, etc.) use your plan’s AI allowance. Check Settings if something fails with a limit message.",
          "Empty-state messages usually tell you the next step (for example, “Promote an idea from Brainstorm”).",
        ],
      },
    ],
  },
  {
    id: "first-week",
    title: "Recommended first-week workflow",
    blocks: [
      {
        type: "steps",
        items: [
          "Brainstorm — Add an idea (or generate suggestions), then Score with AI.",
          "Promote to Project — Creates your project plus starter tasks and milestones.",
          "Build Tracker — Work the board (To Do → In Progress → Done); check off milestones.",
          "Lead Finder — Search your niche, draft a reply, Copy & mark contacted, paste into the community thread.",
          "Growth Engine — Save Brand voice, generate this week’s Growth Coach plan, optionally activate a Launch Playbook.",
          "Revenue — Load sample data to explore, or use subscribe options if plans are available.",
          "Settings — Note your AI / leads / projects usage so you know your limits.",
        ],
      },
      {
        type: "callout",
        text: "When a build is ready to market, use Launch Mode from Build Tracker to jump into Growth with playbooks and coach tuned for that release.",
      },
    ],
  },
  {
    id: "command-center",
    title: "Command Center (Overview)",
    openHref: "/dashboard",
    openLabel: "Open Overview",
    blocks: [
      {
        type: "paragraph",
        text: "How to open: Sidebar → Overview. Page title: Command Center.",
      },
      {
        type: "list",
        items: [
          "Summary cards — scored ideas, active tasks, milestones, pipeline leads, monthly revenue.",
          "Project Journeys — each project’s status and activity. Click Open to jump to Build Tracker.",
          "Milestone Progress — overall and by project; Manage opens Build Tracker.",
          "Recent Ideas — latest ideas and scores; View all opens Brainstorm.",
        ],
      },
      {
        type: "callout",
        text: "If you haven’t promoted anything yet, Overview looks empty—that’s normal. It fills in as you work. Use it as your morning check-in.",
      },
    ],
  },
  {
    id: "brainstorm",
    title: "Brainstorm & Ideas",
    openHref: "/dashboard/brainstorm",
    openLabel: "Open Brainstorm",
    blocks: [
      {
        type: "paragraph",
        text: "Two tabs: Idea Scorer (simple list) and Canvas (visual sessions with an AI co-pilot).",
      },
      {
        type: "paragraph",
        text: "Add ideas: use AI Idea Assistant (niche → Generate → select → Add selected), or fill New Idea → Add Idea. Optionally Enhance current draft with AI.",
      },
      {
        type: "steps",
        items: [
          "Find the idea card and click Score with AI (or Re-score).",
          "Review the score label plus strengths, weaknesses, and recommendations.",
          "When ready, Promote to Project — starter tasks & milestones are added.",
          "Or Archive / Delete ideas you don’t need.",
        ],
      },
      {
        type: "paragraph",
        text: "Canvas: create a Session, add or Generate root ideas, then Explode / Validate / Analyze / Develop / Enhance. Promote to Project from a node when ready.",
      },
      {
        type: "list",
        items: [
          "You don’t need a project before scoring ideas.",
          "Promote from Idea Scorer or Canvas — both create a project for Build Tracker.",
          "Heavy AI use counts against your hourly AI limit (see Settings).",
        ],
      },
    ],
  },
  {
    id: "build-tracker",
    title: "Build Tracker",
    openHref: "/dashboard/build-tracker",
    openLabel: "Open Build Tracker",
    blocks: [
      {
        type: "paragraph",
        text: "Manage projects, tasks, milestones, builds, repo links, and project profile details.",
      },
      {
        type: "list",
        items: [
          "No projects yet? Promote a scored idea, or click New project (optionally Generate AI starter tasks & milestones).",
          "Select a project with the pills at the top; edit or delete as needed.",
          "Tasks & milestones — launch checklist, kanban (To Do / In Progress / Done), Add a task, Generate with AI, open task details.",
          "Builds & releases — status pipeline; Enter Launch Mode when a build is ready to market.",
          "Repository & CI / Project profile — link repo details, version, URL, env notes, and tools for your reference.",
        ],
      },
      {
        type: "steps",
        items: [
          "Open Build Tracker and select the project.",
          "When a build is launch-ready, click Launch Mode or Enter Launch Mode.",
          "You’re taken to Growth Engine with coach and playbooks prepared for that release.",
        ],
      },
      {
        type: "callout",
        text: "If you don’t see Launch Mode yet, keep advancing builds until one is ready to market.",
      },
    ],
  },
  {
    id: "lead-finder",
    title: "Lead Finder",
    openHref: "/dashboard/lead-finder",
    openLabel: "Open Lead Finder",
    blocks: [
      {
        type: "paragraph",
        text: "Find real conversations (for example on Reddit and Hacker News), save them as leads, draft replies, and track outreach.",
      },
      {
        type: "steps",
        items: [
          "Enter a niche (example: SaaS for real estate agents).",
          "Click Find posts (you’ll see Mining posts… while it works).",
          "Review cards — author, community, approach, relevance, engagement.",
          "Draft reply → Copy & mark contacted → paste into the community thread.",
        ],
      },
      {
        type: "table",
        headers: ["Action", "What it does"],
        rows: [
          ["Open thread", "Opens the original conversation"],
          ["Draft / Regenerate reply", "AI writes a paste-ready reply"],
          ["Copy & mark contacted", "Copies the reply and logs outreach"],
          ["Mark Qualified / Contacted / Rejected", "Updates status manually"],
          ["Promote to project", "Creates a project from the lead"],
          ["Add manually", "Save a lead that isn’t from search"],
        ],
      },
      {
        type: "list",
        items: [
          "Filter by All leads, Unassigned, or a project.",
          "Select a project filter before drafting to use that project’s brand voice.",
          "If few live posts appear, try a clearer niche, try again later, or add leads manually.",
        ],
      },
    ],
  },
  {
    id: "growth-engine",
    title: "Growth Engine",
    openHref: "/dashboard/growth-engine",
    openLabel: "Open Growth Engine",
    blocks: [
      {
        type: "paragraph",
        text: "Built for solopreneurs who are not full-time marketers. You need at least one project first—promote an idea or create one in Build Tracker.",
      },
      {
        type: "list",
        items: [
          "Growth Coach — Generate / Regenerate a focused weekly (or launch-week) plan; check actions off as you go. Brand voice (Tone, Avoid, Audience → Save voice) lives on this tab.",
          "Content Calendar — Quick add draft, AI ideas, or Plan 2 weeks; edit status, rewrite with brand voice, fan-out, A/B variants, hashtags.",
          "Launch Playbooks — Activate + generate copy, check steps, copy packs, Open site.",
          "Campaigns — Add name, channel, and notes; set draft / active / paused / completed.",
          "SEO — Add keywords or AI Suggest; treat volume/difficulty as planning aids, not guarantees.",
        ],
      },
      {
        type: "callout",
        text: "Deep links: /dashboard/growth-engine?projectId=…&tab=campaigns (also coach, calendar, playbooks, seo). Panels collapse and remember your preference. Launch Mode opens playbooks for that project.",
      },
    ],
  },
  {
    id: "revenue",
    title: "Revenue & Billing",
    openHref: "/dashboard/revenue",
    openLabel: "Open Revenue",
    blocks: [
      {
        type: "paragraph",
        text: "Sidebar label: Revenue & Billing. Page title: Revenue & Analytics.",
      },
      {
        type: "list",
        items: [
          "View Monthly Recurring Revenue, total revenue, active subscriptions, and average revenue per user.",
          "Browse Subscriptions and Transactions tables.",
          "If plans are available, use Subscribe to … for checkout.",
          "If there’s no data yet, click Load sample data to explore the screens.",
        ],
      },
      {
        type: "callout",
        text: "Sample data is for learning the layout—it is not your real payment balance.",
      },
    ],
  },
  {
    id: "repository",
    title: "Repository & VCS",
    openHref: "/dashboard/repository",
    openLabel: "Open Repository",
    blocks: [
      {
        type: "steps",
        items: [
          "Select a project (promote an idea first if you have none).",
          "Enter the GitHub URL.",
          "Optionally provide a GitHub token → Save connection.",
          "Review stats when available; use Repo monitoring (branch health, webhook copy, Sync from GitHub).",
        ],
      },
      {
        type: "callout",
        text: "If you only see “Repository linked” without live stats, add a token in the form or finish GitHub/webhook setup with whoever manages hosting.",
      },
    ],
  },
  {
    id: "settings",
    title: "Settings, privacy & limits",
    openHref: "/dashboard/settings",
    openLabel: "Open Settings",
    blocks: [
      {
        type: "list",
        items: [
          "Production readiness — health badge for core services; refresh after config changes.",
          "Plan usage — AI calls this hour, leads used/limit, projects used/limit. Check here first if AI or search actions fail.",
          "Export my data — downloads your projects, ideas, leads, and related information.",
          "Delete account — permanently removes your account and data after confirmation (cannot be undone).",
        ],
      },
    ],
  },
  {
    id: "troubleshooting",
    title: "Tips & troubleshooting",
    blocks: [
      {
        type: "table",
        headers: ["Situation", "What to try"],
        rows: [
          [
            "Can’t open dashboard",
            "Sign in again from the home page (Sign in / Get started).",
          ],
          [
            "“Create a project first”",
            "Brainstorm → Score → Promote to Project, or New project in Build Tracker.",
          ],
          [
            "AI buttons fail",
            "Settings → check AI calls remaining; wait for the hour to reset.",
          ],
          [
            "Few live posts in Lead Finder",
            "Try a clearer niche, try again later, or Add manually.",
          ],
          [
            "No Launch Mode button",
            "Advance a build to a ready-to-market state, then Enter Launch Mode.",
          ],
          [
            "Draft reply feels generic",
            "Save Brand voice in Growth Coach, select that project in Lead Finder, draft again.",
          ],
          [
            "Revenue looks empty",
            "Load sample data, or complete Subscribe when plans are shown.",
          ],
          [
            "GitHub linked but no stats",
            "Add a token in Repository; confirm webhook setup if you need automatic builds.",
          ],
        ],
      },
      {
        type: "list",
        items: [
          "Score before you build.",
          "One project focus per week in Growth Coach.",
          "Always Copy & mark contacted so your pipeline stays honest.",
          "Use Launch Mode at ship time so playbooks and coach start together.",
        ],
      },
    ],
  },
  {
    id: "glossary",
    title: "Glossary",
    blocks: [
      {
        type: "table",
        headers: ["Term", "Meaning"],
        rows: [
          ["Command Center", "Overview dashboard summarizing your pipeline"],
          ["Idea", "A product concept you capture and score"],
          ["Promote", "Turn an idea or lead into a project"],
          ["Project", "Hub for tasks, growth, repo, and related work"],
          ["Milestone", "A larger launch checkpoint"],
          ["Lead", "A person or post worth following up with"],
          ["Brand voice", "Tone, audience, and avoid rules for AI writing"],
          ["Growth Coach", "Weekly or launch-week action plan"],
          ["Launch Mode", "Growth setup when a build is ready to market"],
          ["Playbook", "Launch checklist with suggested copy"],
          ["MRR", "Monthly Recurring Revenue"],
          ["Canvas", "Visual brainstorming with branching ideas"],
        ],
      },
    ],
  },
];
