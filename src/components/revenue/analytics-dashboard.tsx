"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  AlertTriangle,
  BarChart3,
  Target,
  Activity,
} from "lucide-react";
import {
  calculateMRRHistory,
  analyzeChurn,
  forecastRevenue,
  calculateRevenueSummary,
  type MRRDataPoint,
  type RevenueForecast,
  type ChurnAnalysis,
} from "@/lib/revenue-analytics";

type Subscription = {
  id: string;
  status: string;
  current_period_start: string;
  current_period_end: string | null;
  created_at: string;
  plan?: { id: string; amount: number; interval: string };
};

type Transaction = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  type: string;
  created_at: string;
};

type Plan = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  interval: string;
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// --- SVG Chart Components ---

function MRRChart({ data }: { data: MRRDataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No MRR data available
      </div>
    );
  }

  const maxMRR = Math.max(...data.map((d) => d.mrr), 1);
  const chartWidth = 600;
  const chartHeight = 200;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const width = chartWidth - padding.left - padding.right;
  const height = chartHeight - padding.top - padding.bottom;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * width,
    y: padding.top + height - (d.mrr / maxMRR) * height,
    mrr: d.mrr,
    month: d.month,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const areaD = `${pathD} L ${points[points.length - 1]!.x} ${padding.top + height} L ${points[0]!.x} ${padding.top + height} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-64">
        <defs>
          <linearGradient id="mrrGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--os-cyan))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--os-cyan))" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <g key={ratio}>
            <line
              x1={padding.left}
              y1={padding.top + height * (1 - ratio)}
              x2={padding.left + width}
              y2={padding.top + height * (1 - ratio)}
              stroke="currentColor"
              className="text-border"
              strokeDasharray="4"
            />
            <text
              x={padding.left - 8}
              y={padding.top + height * (1 - ratio) + 4}
              textAnchor="end"
              className="text-[10px] fill-muted-foreground"
            >
              {formatCurrency(maxMRR * ratio)}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaD} fill="url(#mrrGradient)" />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="hsl(var(--os-cyan))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="hsl(var(--os-cyan))" />
            <text
              x={p.x}
              y={padding.top + height + 16}
              textAnchor="middle"
              className="text-[9px] fill-muted-foreground"
            >
              {p.month.slice(5)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function ForecastChart({ forecast }: { forecast: RevenueForecast }) {
  if (forecast.months.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No forecast data available
      </div>
    );
  }

  const allValues = forecast.months.flatMap((m) => [
    m.projected,
    m.optimistic,
    m.pessimistic,
  ]);
  const maxValue = Math.max(...allValues, 1);
  const chartWidth = 600;
  const chartHeight = 200;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const width = chartWidth - padding.left - padding.right;
  const height = chartHeight - padding.top - padding.bottom;

  const toX = (i: number) => padding.left + (i / (forecast.months.length - 1)) * width;
  const toY = (v: number) => padding.top + height - (v / maxValue) * height;

  const projectedPath = forecast.months
    .map((m, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(m.projected)}`)
    .join(" ");

  const optimisticPath = forecast.months
    .map((m, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(m.optimistic)}`)
    .join(" ");

  const pessimisticPath = forecast.months
    .map((m, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(m.pessimistic)}`)
    .join(" ");

  // Confidence band
  const bandD = [
    ...forecast.months.map((m, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(m.optimistic)}`),
    ...forecast.months
      .slice()
      .reverse()
      .map((m, i) => `L ${toX(forecast.months.length - 1 - i)} ${toY(m.pessimistic)}`),
    "Z",
  ].join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-64">
        <defs>
          <linearGradient id="forecastBand" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <g key={ratio}>
            <line
              x1={padding.left}
              y1={padding.top + height * (1 - ratio)}
              x2={padding.left + width}
              y2={padding.top + height * (1 - ratio)}
              stroke="currentColor"
              className="text-border"
              strokeDasharray="4"
            />
            <text
              x={padding.left - 8}
              y={padding.top + height * (1 - ratio) + 4}
              textAnchor="end"
              className="text-[10px] fill-muted-foreground"
            >
              {formatCurrency(maxValue * ratio)}
            </text>
          </g>
        ))}

        {/* Confidence band */}
        <path d={bandD} fill="url(#forecastBand)" />

        {/* Lines */}
        <path d={optimisticPath} fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4" />
        <path d={pessimisticPath} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4" />
        <path d={projectedPath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />

        {/* Data points */}
        {forecast.months.map((m, i) => (
          <g key={i}>
            <circle cx={toX(i)} cy={toY(m.projected)} r="4" fill="#6366f1" />
            <text
              x={toX(i)}
              y={padding.top + height + 16}
              textAnchor="middle"
              className="text-[9px] fill-muted-foreground"
            >
              {m.month.slice(5)}
            </text>
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-[#6366f1]" />
          <span className="text-muted-foreground">Projected</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-[#10b981] border-dashed" />
          <span className="text-muted-foreground">Optimistic</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-[#f59e0b] border-dashed" />
          <span className="text-muted-foreground">Pessimistic</span>
        </div>
      </div>
    </div>
  );
}

function ChurnCard({ analysis }: { analysis: ChurnAnalysis }) {
  return (
    <Card className="p-6 bg-secondary/20 border-border">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-orange-500" />
        <h3 className="font-semibold">Churn Analysis</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Churn Rate</p>
          <p className="text-2xl font-bold text-orange-500">
            {formatPercent(analysis.churnRate)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Avg. Lifetime</p>
          <p className="text-2xl font-bold">
            {Math.round(analysis.averageLifetimeDays)}d
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Canceled</p>
          <p className="text-2xl font-bold">{analysis.totalCanceled}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Revenue Lost</p>
          <p className="text-2xl font-bold text-red-500">
            {formatCurrency(analysis.revenueLost)}
          </p>
        </div>
      </div>
    </Card>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "text-foreground",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <Card className="p-6 bg-secondary/20 border-border">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-secondary">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}

// --- Main Dashboard Component ---

export function AnalyticsDashboard({
  subscriptions,
  transactions,
  plans,
}: {
  subscriptions: Subscription[];
  transactions: Transaction[];
  plans: Plan[];
}) {
  const analytics = useMemo(() => {
    // Convert DTOs to analytics types
    const subs = subscriptions.map((s) => ({
      id: s.id,
      status: s.status as "active" | "canceled" | "past_due" | "trialing",
      currentPeriodStart: new Date(s.current_period_start),
      currentPeriodEnd: s.current_period_end ? new Date(s.current_period_end) : null,
      canceledAt: null,
      planId: s.plan?.id ?? "",
      customerId: "",
      createdAt: new Date(s.created_at),
    }));

    const txns = transactions.map((t) => ({
      id: t.id,
      amount: t.amount,
      currency: t.currency,
      status: t.status as "succeeded" | "pending" | "failed" | "refunded",
      type: t.type as "payment" | "refund",
      createdAt: new Date(t.created_at),
      customerId: null,
    }));

    const planList = plans.map((p) => ({
      id: p.id,
      name: p.name,
      amount: p.amount,
      currency: p.currency,
      interval: p.interval as "month" | "year" | "week",
    }));

    return {
      mrrHistory: calculateMRRHistory(subs, planList, 12),
      forecast: forecastRevenue(subs, planList, 6),
      churn: analyzeChurn(subs, planList),
      summary: calculateRevenueSummary(txns, subs, planList),
    };
  }, [subscriptions, transactions, plans]);

  const mrrTrend =
    analytics.summary.mrrChangePercent > 0
      ? "up"
      : analytics.summary.mrrChangePercent < 0
        ? "down"
        : "flat";

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Current MRR"
          value={formatCurrency(analytics.summary.currentMRR)}
          sub={`${mrrTrend === "up" ? "+" : ""}${formatPercent(analytics.summary.mrrChangePercent)} vs last month`}
          color={mrrTrend === "up" ? "text-emerald-500" : mrrTrend === "down" ? "text-red-500" : ""}
        />
        <StatCard
          icon={DollarSign}
          label="Annual Run Rate"
          value={formatCurrency(analytics.summary.annualRunRate)}
        />
        <StatCard
          icon={Users}
          label="Active Subscriptions"
          value={analytics.summary.activeSubscriptions.toString()}
        />
        <StatCard
          icon={Target}
          label="Avg. Revenue Per User"
          value={formatCurrency(analytics.summary.averageRevenuePerUser)}
        />
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={Activity}
          label="Revenue (30d)"
          value={formatCurrency(analytics.summary.totalRevenue30d)}
        />
        <StatCard
          icon={BarChart3}
          label="Revenue (90d)"
          value={formatCurrency(analytics.summary.totalRevenue90d)}
        />
        <StatCard
          icon={TrendingDown}
          label="Customer LTV"
          value={formatCurrency(analytics.summary.ltv)}
          sub={`Churn: ${formatPercent(analytics.summary.churnRate)}`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* MRR Trend */}
        <Card className="p-6 bg-secondary/20 border-border">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[hsl(var(--os-cyan))]" />
            <h3 className="font-semibold">MRR Trend (12 Months)</h3>
          </div>
          <MRRChart data={analytics.mrrHistory} />
        </Card>

        {/* Revenue Forecast */}
        <Card className="p-6 bg-secondary/20 border-border">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            <h3 className="font-semibold">Revenue Forecast (6 Months)</h3>
          </div>
          <ForecastChart forecast={analytics.forecast} />
        </Card>
      </div>

      {/* Churn & Forecast Assumptions */}
      <div className="grid gap-8 lg:grid-cols-2">
        <ChurnCard analysis={analytics.churn} />

        <Card className="p-6 bg-secondary/20 border-border">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-indigo-500" />
            <h3 className="font-semibold">Forecast Assumptions</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Monthly Growth Rate</span>
              <span className="font-mono font-medium">
                {formatPercent(analytics.forecast.assumptions.growthRate)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Monthly Churn Rate</span>
              <span className="font-mono font-medium text-orange-500">
                {formatPercent(analytics.forecast.assumptions.churnRate)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Avg. Revenue Per User</span>
              <span className="font-mono font-medium">
                {formatCurrency(analytics.forecast.assumptions.averageRevenuePerUser)}
              </span>
            </div>
          </div>

          {/* 6-Month Projection Table */}
          <div className="mt-6 pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              6-Month Projection
            </h4>
            <div className="space-y-2">
              {analytics.forecast.months.map((m) => (
                <div
                  key={m.month}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">{m.month}</span>
                  <div className="flex gap-4 font-mono">
                    <span className="text-emerald-500">
                      {formatCurrency(m.optimistic)}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(m.projected)}
                    </span>
                    <span className="text-orange-500">
                      {formatCurrency(m.pessimistic)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
