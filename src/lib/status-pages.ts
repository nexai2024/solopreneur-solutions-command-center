/**
 * Public Project Status Pages
 *
 * Generates shareable, public status pages for projects.
 * Pure-TypeScript HTML/CSS generation — no dependencies.
 * Perfect for solopreneurs to share project status with users/investors.
 */

export type ProjectStatus = "operational" | "degraded" | "outage" | "maintenance";

export type StatusIncident = {
  id: string;
  title: string;
  description: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  severity: "minor" | "major" | "critical";
  createdAt: Date;
  resolvedAt: Date | null;
  updates: Array<{
    message: string;
    timestamp: Date;
    status: string;
  }>;
};

export type StatusPageConfig = {
  projectId: string;
  projectName: string;
  description: string;
  status: ProjectStatus;
  uptime: number;
  incidents: StatusIncident[];
  lastUpdated: Date;
  customDomain?: string;
  logoUrl?: string;
};

export type StatusPageMetrics = {
  uptime30d: number;
  uptime90d: number;
  uptime365d: number;
  averageResponseTime: number;
  totalIncidents: number;
  resolvedIncidents: number;
};

// --- Status Page HTML Generation ---

const STATUS_COLORS: Record<ProjectStatus, string> = {
  operational: "#10b981",
  degraded: "#f59e0b",
  outage: "#ef4444",
  maintenance: "#6366f1",
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  operational: "All Systems Operational",
  degraded: "Partially Degraded",
  outage: "Major Outage",
  maintenance: "Under Maintenance",
};

const SEVERITY_COLORS: Record<string, string> = {
  minor: "#f59e0b",
  major: "#f97316",
  critical: "#ef4444",
};

/**
 * Generate a public status page HTML string
 */
export function generateStatusPageHTML(config: StatusPageConfig): string {
  const statusColor = STATUS_COLORS[config.status];
  const statusLabel = STATUS_LABELS[config.status];
  const uptimeColor = config.uptime >= 99.9 ? "#10b981" : config.uptime >= 99 ? "#f59e0b" : "#ef4444";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.projectName} Status</title>
  <meta name="description" content="Status page for ${config.projectName}">
  <meta property="og:title" content="${config.projectName} Status">
  <meta property="og:description" content="Real-time status for ${config.projectName}">
  <meta name="robots" content="noindex, nofollow">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
      padding: 2rem;
    }
    .container { max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 3rem; }
    .logo { max-height: 48px; margin-bottom: 1rem; }
    .project-name { font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem; }
    .description { color: #94a3b8; margin-bottom: 2rem; }
    .status-banner {
      padding: 1.5rem;
      border-radius: 12px;
      text-align: center;
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 2rem;
      background: ${statusColor}20;
      border: 1px solid ${statusColor}40;
      color: ${statusColor};
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-bottom: 3rem;
    }
    .metric {
      background: #1e293b;
      padding: 1.5rem;
      border-radius: 12px;
      text-align: center;
    }
    .metric-value { font-size: 2rem; font-weight: 700; color: ${uptimeColor}; }
    .metric-label { color: #94a3b8; font-size: 0.875rem; margin-top: 0.5rem; }
    .incidents { margin-top: 2rem; }
    .incidents-title { font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem; }
    .incident {
      background: #1e293b;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      border-left: 4px solid;
    }
    .incident.minor { border-left-color: ${SEVERITY_COLORS.minor}; }
    .incident.major { border-left-color: ${SEVERITY_COLORS.major}; }
    .incident.critical { border-left-color: ${SEVERITY_COLORS.critical}; }
    .incident-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .incident-title { font-weight: 600; }
    .incident-status {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .incident-status.investigating { background: #fef3c7; color: #92400e; }
    .incident-status.identified { background: #dbeafe; color: #1e40af; }
    .incident-status.monitoring { background: #e0e7ff; color: #3730a3; }
    .incident-status.resolved { background: #d1fae5; color: #065f46; }
    .incident-time { color: #64748b; font-size: 0.875rem; }
    .incident-description { color: #94a3b8; margin-top: 0.5rem; }
    .incident-updates { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #334155; }
    .update { margin-bottom: 0.5rem; font-size: 0.875rem; }
    .update-time { color: #64748b; }
    .update-message { color: #cbd5e1; }
    .footer { text-align: center; margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #1e293b; color: #64748b; font-size: 0.875rem; }
    .no-incidents { color: #10b981; text-align: center; padding: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${config.logoUrl ? `<img src="${config.logoUrl}" alt="${config.projectName}" class="logo">` : ""}
      <h1 class="project-name">${config.projectName}</h1>
      <p class="description">${config.description}</p>
    </div>

    <div class="status-banner" role="status" aria-live="polite">
      ${statusLabel}
    </div>

    <div class="metrics">
      <div class="metric">
        <div class="metric-value">${config.uptime.toFixed(2)}%</div>
        <div class="metric-label">Current Uptime</div>
      </div>
      <div class="metric">
        <div class="metric-value">${config.incidents.filter((i) => i.status !== "resolved").length}</div>
        <div class="metric-label">Active Incidents</div>
      </div>
      <div class="metric">
        <div class="metric-value">${config.incidents.length}</div>
        <div class="metric-label">Total Incidents</div>
      </div>
    </div>

    <div class="incidents">
      <h2 class="incidents-title">Incidents</h2>
      ${config.incidents.length === 0
        ? '<div class="no-incidents">No incidents reported</div>'
        : config.incidents
            .map(
              (incident) => `
        <div class="incident ${incident.severity}">
          <div class="incident-header">
            <span class="incident-title">${incident.title}</span>
            <span class="incident-status ${incident.status}">${incident.status}</span>
          </div>
          <div class="incident-time">${formatDate(incident.createdAt)}${incident.resolvedAt ? ` — Resolved ${formatDate(incident.resolvedAt)}` : ""}</div>
          <div class="incident-description">${incident.description}</div>
          ${incident.updates.length > 0
            ? `<div class="incident-updates">
                ${incident.updates
                  .map(
                    (update) => `
                  <div class="update">
                    <span class="update-time">[${update.status}]</span>
                    <span class="update-message">${update.message}</span>
                  </div>`
                  )
                  .join("")}
              </div>`
            : ""}
        </div>`
            )
            .join("")}
    </div>

    <div class="footer">
      <p>Last updated: ${formatDate(config.lastUpdated)}</p>
      <p>Powered by Solopreneur Command Center</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate status page JSON (for API consumption)
 */
export function generateStatusPageJSON(config: StatusPageConfig): object {
  return {
    name: config.projectName,
    description: config.description,
    status: config.status,
    statusLabel: STATUS_LABELS[config.status],
    uptime: config.uptime,
    lastUpdated: config.lastUpdated.toISOString(),
    incidents: config.incidents.map((incident) => ({
      id: incident.id,
      title: incident.title,
      description: incident.description,
      status: incident.status,
      severity: incident.severity,
      createdAt: incident.createdAt.toISOString(),
      resolvedAt: incident.resolvedAt?.toISOString() ?? null,
      updates: incident.updates.map((update) => ({
        message: update.message,
        timestamp: update.timestamp.toISOString(),
        status: update.status,
      })),
    })),
  };
}

/**
 * Generate a simple status badge SVG
 */
export function generateStatusBadge(status: ProjectStatus, uptime?: number): string {
  const color = STATUS_COLORS[status];
  const label = uptime !== undefined ? `${uptime.toFixed(1)}%` : STATUS_LABELS[status];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="28">
  <rect width="120" height="28" rx="4" fill="${color}"/>
  <text x="60" y="18" font-family="sans-serif" font-size="12" font-weight="bold" fill="white" text-anchor="middle">${label}</text>
</svg>`;
}

/**
 * Calculate status page metrics from historical data
 */
export function calculateStatusMetrics(
  uptimeHistory: Array<{ date: Date; uptime: number }>,
  incidents: StatusIncident[]
): StatusPageMetrics {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const uptime30d = calculateAverageUptime(
    uptimeHistory.filter((h) => h.date >= thirtyDaysAgo)
  );
  const uptime90d = calculateAverageUptime(
    uptimeHistory.filter((h) => h.date >= ninetyDaysAgo)
  );
  const uptime365d = calculateAverageUptime(
    uptimeHistory.filter((h) => h.date >= yearAgo)
  );

  const resolvedIncidents = incidents.filter((i) => i.status === "resolved");

  return {
    uptime30d,
    uptime90d,
    uptime365d,
    averageResponseTime: 0,
    totalIncidents: incidents.length,
    resolvedIncidents: resolvedIncidents.length,
  };
}

function calculateAverageUptime(
  history: Array<{ date: Date; uptime: number }>
): number {
  if (history.length === 0) return 100;
  const sum = history.reduce((acc, h) => acc + h.uptime, 0);
  return sum / history.length;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Generate RSS feed for incidents
 */
export function generateIncidentFeed(config: StatusPageConfig): string {
  const items = config.incidents
    .map(
      (incident) => `
    <item>
      <title>${escapeXml(incident.title)}</title>
      <description>${escapeXml(incident.description)}</description>
      <pubDate>${incident.createdAt.toUTCString()}</pubDate>
      <guid>${config.projectId}-${incident.id}</guid>
    </item>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(config.projectName)} Status</title>
    <description>${escapeXml(config.description)}</description>
    <link>${config.customDomain ? `https://${config.customDomain}` : "#"}</link>
    <lastBuildDate>${config.lastUpdated.toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
