import { describe, expect, it } from "vitest";
import {
  generateStatusPageHTML,
  generateStatusPageJSON,
  generateStatusBadge,
  calculateStatusMetrics,
  generateIncidentFeed,
  type StatusPageConfig,
  type StatusIncident,
} from "@/lib/status-pages";

function makeIncident(overrides: Partial<StatusIncident> = {}): StatusIncident {
  return {
    id: "inc-1",
    title: "Test Incident",
    description: "A test incident",
    status: "investigating",
    severity: "minor",
    createdAt: new Date(),
    resolvedAt: null,
    updates: [],
    ...overrides,
  };
}

function makeConfig(overrides: Partial<StatusPageConfig> = {}): StatusPageConfig {
  return {
    projectId: "proj-1",
    projectName: "My Project",
    description: "Project status page",
    status: "operational",
    uptime: 99.99,
    incidents: [],
    lastUpdated: new Date(),
    ...overrides,
  };
}

describe("generateStatusPageHTML", () => {
  it("generates valid HTML", () => {
    const config = makeConfig();
    const html = generateStatusPageHTML(config);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
    expect(html).toContain("My Project");
  });

  it("includes status banner", () => {
    const config = makeConfig({ status: "operational" });
    const html = generateStatusPageHTML(config);
    expect(html).toContain("All Systems Operational");
  });

  it("includes incidents", () => {
    const config = makeConfig({
      incidents: [makeIncident({ title: "Outage Alert" })],
    });
    const html = generateStatusPageHTML(config);
    expect(html).toContain("Outage Alert");
  });

  it("shows no incidents message", () => {
    const config = makeConfig({ incidents: [] });
    const html = generateStatusPageHTML(config);
    expect(html).toContain("No incidents reported");
  });
});

describe("generateStatusPageJSON", () => {
  it("returns valid JSON structure", () => {
    const config = makeConfig();
    const json = generateStatusPageJSON(config) as Record<string, unknown>;
    expect(json.name).toBe("My Project");
    expect(json.status).toBe("operational");
    expect(json.uptime).toBe(99.99);
    expect(Array.isArray(json.incidents)).toBe(true);
  });

  it("includes incident details", () => {
    const incident = makeIncident({
      title: "Bug Report",
      status: "resolved",
      resolvedAt: new Date(),
    });
    const config = makeConfig({ incidents: [incident] });
    const json = generateStatusPageJSON(config) as Record<string, unknown>;
    const incidents = json.incidents as Array<Record<string, unknown>>;
    expect(incidents).toHaveLength(1);
    expect(incidents[0]!.title).toBe("Bug Report");
  });
});

describe("generateStatusBadge", () => {
  it("generates SVG badge", () => {
    const svg = generateStatusBadge("operational");
    expect(svg).toContain("<svg");
    expect(svg).toContain("All Systems Operational");
    expect(svg).toContain("</svg>");
  });

  it("includes uptime percentage", () => {
    const svg = generateStatusBadge("operational", 99.9);
    expect(svg).toContain("99.9%");
  });
});

describe("calculateStatusMetrics", () => {
  it("calculates uptime metrics", () => {
    const history = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      uptime: 99.9,
    }));
    const incidents = [makeIncident({ status: "resolved" })];

    const metrics = calculateStatusMetrics(history, incidents);
    expect(metrics.uptime30d).toBeCloseTo(99.9);
    expect(metrics.totalIncidents).toBe(1);
    expect(metrics.resolvedIncidents).toBe(1);
  });

  it("handles empty history", () => {
    const metrics = calculateStatusMetrics([], []);
    expect(metrics.uptime30d).toBe(100);
    expect(metrics.totalIncidents).toBe(0);
  });
});

describe("generateIncidentFeed", () => {
  it("generates valid RSS XML", () => {
    const config = makeConfig({
      incidents: [makeIncident({ title: "Test Incident" })],
    });
    const feed = generateIncidentFeed(config);
    expect(feed).toContain("<?xml");
    expect(feed).toContain("<rss");
    expect(feed).toContain("Test Incident");
    expect(feed).toContain("</rss>");
  });

  it("escapes XML special characters", () => {
    const config = makeConfig({
      incidents: [makeIncident({ title: "Test <Incident> & \"More\"" })],
    });
    const feed = generateIncidentFeed(config);
    expect(feed).toContain("&lt;Incident&gt;");
    expect(feed).toContain("&amp;");
    expect(feed).toContain("&quot;");
  });
});
