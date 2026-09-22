/**
 * Role-aware merge planning for brainstorm canvas nodes.
 *
 * Combinations:
 * - 1 Idea + Features/Stories/Tasks → Idea stays primary; others attach as features
 * - 1 Idea + Research/Risk/Marketing → Idea stays primary; notes enrich content
 * - 2+ Ideas (+ support) → synthesize ideas; attach support as features/context
 * - Features only (no Idea) → invent Idea that owns those features
 * - Context only (Research/Risk/Marketing/Task, no Idea/Feature) → invent Idea from notes
 */

export type MergeNodeRole =
  | "idea"
  | "feature"
  | "research"
  | "risk"
  | "marketing"
  | "task"
  | "other";

export type MergeStrategy =
  | "enrich_primary_idea"
  | "synthesize_ideas"
  | "promote_features"
  | "synthesize_context";

export type MergeNodeInput = {
  id: string;
  title: string;
  content: string;
  nodeType: string;
  coreProblem: string | null;
  proposedSolution: string | null;
  targetUserPersona: string | null;
  /** Existing child Feature/User Story labels under this node */
  features: string[];
};

export type MergePlan = {
  strategy: MergeStrategy;
  primaryIdeas: MergeNodeInput[];
  /** Deduped feature labels to attach under the resulting Idea */
  featureLabels: string[];
  research: MergeNodeInput[];
  risks: MergeNodeInput[];
  marketing: MergeNodeInput[];
  tasks: MergeNodeInput[];
  other: MergeNodeInput[];
  /** Human-readable strategy summary for prompts / rationale */
  strategySummary: string;
};

export function classifyMergeRole(nodeType: string): MergeNodeRole {
  switch (nodeType) {
    case "Idea":
      return "idea";
    case "Feature":
    case "User Story":
      return "feature";
    case "Research":
      return "research";
    case "Risk":
      return "risk";
    case "Marketing":
      return "marketing";
    case "Task":
      return "task";
    default:
      return "other";
  }
}

function labelOf(node: MergeNodeInput): string {
  return (node.title || node.content || "").trim();
}

function dedupeLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of labels) {
    const label = raw.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

/**
 * Classify selected nodes into a merge plan with an explicit strategy.
 */
export function planMerge(nodes: MergeNodeInput[]): MergePlan {
  const primaryIdeas: MergeNodeInput[] = [];
  const featureNodes: MergeNodeInput[] = [];
  const research: MergeNodeInput[] = [];
  const risks: MergeNodeInput[] = [];
  const marketing: MergeNodeInput[] = [];
  const tasks: MergeNodeInput[] = [];
  const other: MergeNodeInput[] = [];

  for (const node of nodes) {
    switch (classifyMergeRole(node.nodeType)) {
      case "idea":
        primaryIdeas.push(node);
        break;
      case "feature":
        featureNodes.push(node);
        break;
      case "research":
        research.push(node);
        break;
      case "risk":
        risks.push(node);
        break;
      case "marketing":
        marketing.push(node);
        break;
      case "task":
        tasks.push(node);
        break;
      default:
        other.push(node);
        break;
    }
  }

  // Features = selected Feature/User Story nodes + child features of Ideas + Tasks as scope items
  const featureLabels = dedupeLabels([
    ...featureNodes.map(labelOf),
    ...primaryIdeas.flatMap((idea) => idea.features),
    ...tasks.map(labelOf),
    ...other
      .filter((n) => classifyMergeRole(n.nodeType) === "feature")
      .map(labelOf),
  ]);

  let strategy: MergeStrategy;
  let strategySummary: string;

  if (primaryIdeas.length === 1) {
    strategy = "enrich_primary_idea";
    const idea = primaryIdeas[0]!;
    const parts = [
      `Keep Idea “${labelOf(idea)}” as the primary entity`,
      featureNodes.length
        ? `attach ${featureNodes.length} feature/story node(s) under it`
        : null,
      tasks.length ? `include ${tasks.length} task(s) as feature scope` : null,
      research.length ? `fold in ${research.length} research note(s)` : null,
      risks.length ? `fold in ${risks.length} risk(s)` : null,
      marketing.length ? `fold in ${marketing.length} marketing note(s)` : null,
    ].filter(Boolean);
    strategySummary = parts.join("; ") + ".";
  } else if (primaryIdeas.length >= 2) {
    strategy = "synthesize_ideas";
    strategySummary = `Synthesize ${primaryIdeas.length} Ideas into one concept; attach ${featureLabels.length} feature(s) and fold supporting research/risks/marketing.`;
  } else if (featureNodes.length > 0 || featureLabels.length > 0) {
    strategy = "promote_features";
    strategySummary = `No Idea selected — invent a parent Idea that owns ${featureLabels.length} feature(s); absorb research/risks/marketing as context.`;
  } else {
    strategy = "synthesize_context";
    strategySummary =
      "No Idea or Feature selected — synthesize a new Idea from research, risks, marketing, and other notes.";
  }

  return {
    strategy,
    primaryIdeas,
    featureLabels,
    research,
    risks,
    marketing,
    tasks,
    other,
    strategySummary,
  };
}

export type StructuralMergeResult = {
  title: string;
  content: string;
  coreProblem: string;
  proposedSolution: string;
  targetUserPersona: string;
  combinedFeatures: string[];
  rationale: string;
  /** When true, AI should polish content but must preserve title/spine of primary idea */
  needsAiPolish: boolean;
};

function section(title: string, nodes: MergeNodeInput[]): string {
  if (nodes.length === 0) return "";
  const lines = nodes.map((n) => `• ${labelOf(n)}${n.content && n.content !== n.title ? `: ${n.content}` : ""}`);
  return `\n\n${title}:\n${lines.join("\n")}`;
}

/**
 * Deterministic merge for enrich_primary_idea (and fallbacks).
 * Ensures Idea remains the main entity and features stay features.
 */
export function buildStructuralMerge(plan: MergePlan): StructuralMergeResult {
  const features = plan.featureLabels.slice(0, 16);

  if (plan.strategy === "enrich_primary_idea" && plan.primaryIdeas[0]) {
    const primary = plan.primaryIdeas[0];
    const supportSections =
      section("Research", plan.research) +
      section("Risks", plan.risks) +
      section("Marketing", plan.marketing);

    const featureBlock =
      features.length > 0
        ? `\n\nFeatures:\n${features.map((f) => `• ${f}`).join("\n")}`
        : "";

    const hasSupportContext =
      plan.research.length + plan.risks.length + plan.marketing.length > 0;

    return {
      title: labelOf(primary).slice(0, 100) || "Merged idea",
      content: `${primary.content || labelOf(primary)}${featureBlock}${supportSections}`.trim(),
      coreProblem: primary.coreProblem || "",
      proposedSolution: primary.proposedSolution || "",
      targetUserPersona: primary.targetUserPersona || "",
      combinedFeatures: features,
      rationale: plan.strategySummary,
      needsAiPolish: hasSupportContext,
    };
  }

  if (plan.strategy === "promote_features") {
    const titleSeed = features.slice(0, 2).join(" + ") || "Feature cluster";
    return {
      title: titleSeed.slice(0, 100),
      content: `Product concept unifying: ${features.join("; ")}${section("Research", plan.research)}${section("Risks", plan.risks)}${section("Marketing", plan.marketing)}`.trim(),
      coreProblem: "",
      proposedSolution: "",
      targetUserPersona: "",
      combinedFeatures: features,
      rationale: plan.strategySummary,
      needsAiPolish: true,
    };
  }

  if (plan.strategy === "synthesize_ideas") {
    const ideas = plan.primaryIdeas;
    return {
      title: ideas
        .map((i) => labelOf(i))
        .slice(0, 3)
        .join(" + ")
        .slice(0, 100),
      content: ideas
        .map((i) => i.content || labelOf(i))
        .join("\n\n—\n\n"),
      coreProblem: ideas.map((i) => i.coreProblem).filter(Boolean).join(" | "),
      proposedSolution: ideas
        .map((i) => i.proposedSolution)
        .filter(Boolean)
        .join(" | "),
      targetUserPersona:
        ideas.map((i) => i.targetUserPersona).find(Boolean) || "",
      combinedFeatures: features,
      rationale: plan.strategySummary,
      needsAiPolish: true,
    };
  }

  // synthesize_context
  const notes = [
    ...plan.research,
    ...plan.risks,
    ...plan.marketing,
    ...plan.tasks,
    ...plan.other,
  ];
  return {
    title: "Merged concept",
    content: notes.map((n) => `[${n.nodeType}] ${n.content || labelOf(n)}`).join("\n\n"),
    coreProblem: "",
    proposedSolution: "",
    targetUserPersona: "",
    combinedFeatures: features,
    rationale: plan.strategySummary,
    needsAiPolish: true,
  };
}

/**
 * Build the AI prompt body from a classified plan so the model respects roles.
 */
export function formatMergePrompt(plan: MergePlan): string {
  const fmt = (nodes: MergeNodeInput[]) =>
    nodes
      .map(
        (n) =>
          `- [${n.nodeType}] ${labelOf(n)}\n  ${n.content || "(no extra content)"}${
            n.coreProblem ? `\n  Problem: ${n.coreProblem}` : ""
          }${n.proposedSolution ? `\n  Solution: ${n.proposedSolution}` : ""}${
            n.targetUserPersona ? `\n  Persona: ${n.targetUserPersona}` : ""
          }`
      )
      .join("\n");

  const blocks: string[] = [
    `Strategy: ${plan.strategy}`,
    `Instructions: ${plan.strategySummary}`,
  ];

  if (plan.primaryIdeas.length) {
    blocks.push(
      plan.primaryIdeas.length === 1
        ? `PRIMARY IDEA (keep as the main entity — do not rename into a feature):\n${fmt(plan.primaryIdeas)}`
        : `PRIMARY IDEAS (merge as peer products into one concept):\n${fmt(plan.primaryIdeas)}`
    );
  }

  if (plan.featureLabels.length) {
    blocks.push(
      `FEATURES TO ATTACH (must appear in combinedFeatures; these are children of the Idea, not the product name):\n${plan.featureLabels.map((f) => `- ${f}`).join("\n")}`
    );
  }

  if (plan.research.length) {
    blocks.push(`RESEARCH TO ABSORB into pitch/problem (not features):\n${fmt(plan.research)}`);
  }
  if (plan.risks.length) {
    blocks.push(`RISKS TO FOLD into pitch or dependency notes (not features):\n${fmt(plan.risks)}`);
  }
  if (plan.marketing.length) {
    blocks.push(`MARKETING TO FOLD into pitch/positioning (not features):\n${fmt(plan.marketing)}`);
  }
  if (plan.other.length) {
    blocks.push(`OTHER NODES:\n${fmt(plan.other)}`);
  }

  return blocks.join("\n\n");
}
