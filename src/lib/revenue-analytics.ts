/**
 * Revenue Analytics & Forecasting Engine
 *
 * Pure-TypeScript deterministic analytics for MRR tracking, churn analysis,
 * cohort analysis, and revenue projections. Zero AI calls — analytics are
 * free, instant, and stable for dashboards.
 */

export type Transaction = {
  id: string;
  amount: number;
  currency: string;
  status: "succeeded" | "pending" | "failed" | "refunded";
  type: "payment" | "refund";
  createdAt: Date;
  customerId: string | null;
};

export type Subscription = {
  id: string;
  status: "active" | "canceled" | "past_due" | "trialing";
  currentPeriodStart: Date;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
  planId: string;
  customerId: string;
  createdAt: Date;
};

export type Plan = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  interval: "month" | "year" | "week";
};

export type MRRDataPoint = {
  month: string;
  mrr: number;
  newMRR: number;
  churnedMRR: number;
  expansionMRR: number;
  netMRR: number;
};

export type ChurnAnalysis = {
  totalCanceled: number;
  churnRate: number;
  averageLifetimeDays: number;
  revenueLost: number;
  topReasons: Array<{ reason: string; count: number }>;
};

export type RevenueForecast = {
  months: Array<{
    month: string;
    projected: number;
    optimistic: number;
    pessimistic: number;
  }>;
  assumptions: {
    growthRate: number;
    churnRate: number;
    averageRevenuePerUser: number;
  };
};

export type CohortData = {
  cohortMonth: string;
  initialCount: number;
  retained: Array<{ month: string; count: number; retentionRate: number }>;
};

// --- Utility Functions ---

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthlyAmount(plan: Plan): number {
  switch (plan.interval) {
    case "month":
      return plan.amount;
    case "year":
      return plan.amount / 12;
    case "week":
      return plan.amount * 4.33;
    default:
      return plan.amount;
  }
}

// --- MRR Calculation ---

function calculateMRRAtDate(
  subscriptions: Subscription[],
  plans: Plan[],
  date: Date
): { mrr: number; activeCount: number; newMRR: number; churnedMRR: number } {
  const planMap = new Map(plans.map((p) => [p.id, p]));
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  let mrr = 0;
  let activeCount = 0;
  let newMRR = 0;
  let churnedMRR = 0;

  for (const sub of subscriptions) {
    const plan = planMap.get(sub.planId);
    if (!plan) continue;

    const amount = monthlyAmount(plan);
    const wasActiveBefore = sub.createdAt < monthStart;
    const isActiveNow =
      sub.status === "active" &&
      sub.currentPeriodStart <= monthEnd &&
      (!sub.currentPeriodEnd || sub.currentPeriodEnd >= monthStart);
    const canceledThisMonth =
      sub.canceledAt &&
      sub.canceledAt >= monthStart &&
      sub.canceledAt <= monthEnd;

    if (isActiveNow) {
      mrr += amount;
      activeCount++;
    }

    if (!wasActiveBefore && isActiveNow) {
      newMRR += amount;
    }

    if (wasActiveBefore && canceledThisMonth) {
      churnedMRR += amount;
    }
  }

  return { mrr, activeCount, newMRR, churnedMRR };
}

export function calculateMRRHistory(
  subscriptions: Subscription[],
  plans: Plan[],
  months: number = 12
): MRRDataPoint[] {
  const result: MRRDataPoint[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const { mrr, newMRR, churnedMRR } = calculateMRRAtDate(
      subscriptions,
      plans,
      date
    );

    result.push({
      month: monthKey(date),
      mrr,
      newMRR,
      churnedMRR,
      expansionMRR: 0,
      netMRR: newMRR - churnedMRR,
    });
  }

  return result;
}

// --- Churn Analysis ---

export function analyzeChurn(
  subscriptions: Subscription[],
  plans: Plan[]
): ChurnAnalysis {
  const planMap = new Map(plans.map((p) => [p.id, p]));
  const canceled = subscriptions.filter((s) => s.status === "canceled");

  let totalLifetimeDays = 0;
  let revenueLost = 0;

  for (const sub of canceled) {
    const lifetime =
      (sub.canceledAt?.getTime() ?? Date.now()) - sub.createdAt.getTime();
    totalLifetimeDays += lifetime / (1000 * 60 * 60 * 24);

    const plan = planMap.get(sub.planId);
    if (plan) {
      revenueLost += monthlyAmount(plan);
    }
  }

  const total = subscriptions.length;
  const churnRate = total > 0 ? canceled.length / total : 0;

  return {
    totalCanceled: canceled.length,
    churnRate,
    averageLifetimeDays:
      canceled.length > 0 ? totalLifetimeDays / canceled.length : 0,
    revenueLost,
    topReasons: [],
  };
}

// --- Revenue Forecasting ---

export function forecastRevenue(
  subscriptions: Subscription[],
  plans: Plan[],
  months: number = 6
): RevenueForecast {
  const mrrHistory = calculateMRRHistory(subscriptions, plans, 12);
  const planMap = new Map(plans.map((p) => [p.id, p]));

  // Calculate average monthly growth rate from last 3 months
  const recentMRR = mrrHistory.slice(-3);
  let growthRate = 0;
  if (recentMRR.length >= 2) {
    const firstMRR = recentMRR[0]!.mrr;
    const lastMRR = recentMRR[recentMRR.length - 1]!.mrr;
    if (firstMRR > 0) {
      growthRate = (lastMRR - firstMRR) / firstMRR / (recentMRR.length - 1);
    }
  }

  // Calculate churn rate
  const churnAnalysis = analyzeChurn(subscriptions, plans);
  const churnRate = churnAnalysis.churnRate;

  // Calculate ARPU (Average Revenue Per User)
  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const totalMRR = activeSubs.reduce((sum, sub) => {
    const plan = planMap.get(sub.planId);
    return sum + (plan ? monthlyAmount(plan) : 0);
  }, 0);
  const arpu = activeSubs.length > 0 ? totalMRR / activeSubs.length : 0;

  // Generate forecast
  const now = new Date();
  const lastMRR = mrrHistory[mrrHistory.length - 1]?.mrr ?? totalMRR;
  const forecastMonths: RevenueForecast["months"] = [];

  for (let i = 1; i <= months; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const month = monthKey(date);

    // Projected (base case)
    const projected = lastMRR * Math.pow(1 + growthRate - churnRate, i);

    // Optimistic (+20% growth)
    const optimistic = lastMRR * Math.pow(1 + (growthRate + 0.02) * 1.2 - churnRate * 0.8, i);

    // Pessimistic (-20% growth)
    const pessimistic = lastMRR * Math.pow(1 + (growthRate - 0.02) * 0.8 - churnRate * 1.2, i);

    forecastMonths.push({
      month,
      projected: Math.round(projected * 100) / 100,
      optimistic: Math.round(optimistic * 100) / 100,
      pessimistic: Math.round(pessimistic * 100) / 100,
    });
  }

  return {
    months: forecastMonths,
    assumptions: {
      growthRate,
      churnRate,
      averageRevenuePerUser: arpu,
    },
  };
}

// --- Cohort Analysis ---

export function analyzeCohorts(
  subscriptions: Subscription[],
  months: number = 6
): CohortData[] {
  const now = new Date();
  const cohorts: CohortData[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const cohortStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const cohortEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const cohortKey = monthKey(cohortStart);

    // Subscriptions created in this cohort month
    const cohortSubs = subscriptions.filter(
      (s) => s.createdAt >= cohortStart && s.createdAt <= cohortEnd
    );

    if (cohortSubs.length === 0) continue;

    const retained: CohortData["retained"] = [];

    // Check retention for each subsequent month
    for (let j = 0; j <= Math.min(i, 6); j++) {
      const checkDate = new Date(now.getFullYear(), now.getMonth() - j, 1);
      const checkMonth = monthKey(checkDate);

      const stillActive = cohortSubs.filter((s) => {
        const isActive =
          s.status === "active" &&
          s.currentPeriodStart <= checkDate &&
          (!s.currentPeriodEnd || s.currentPeriodEnd >= checkDate);
        const notCanceledBefore =
          !s.canceledAt || s.canceledAt > checkDate;
        return isActive && notCanceledBefore;
      }).length;

      retained.push({
        month: checkMonth,
        count: stillActive,
        retentionRate: stillActive / cohortSubs.length,
      });
    }

    cohorts.push({
      cohortMonth: cohortKey,
      initialCount: cohortSubs.length,
      retained,
    });
  }

  return cohorts;
}

// --- Summary Stats ---

export type RevenueSummary = {
  currentMRR: number;
  previousMRR: number;
  mrrChange: number;
  mrrChangePercent: number;
  totalRevenue30d: number;
  totalRevenue90d: number;
  activeSubscriptions: number;
  churnRate: number;
  averageRevenuePerUser: number;
  annualRunRate: number;
  ltv: number;
};

export function calculateRevenueSummary(
  transactions: Transaction[],
  subscriptions: Subscription[],
  plans: Plan[]
): RevenueSummary {
  const planMap = new Map(plans.map((p) => [p.id, p]));
  const now = new Date();

  // Current MRR
  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const currentMRR = activeSubs.reduce((sum, sub) => {
    const plan = planMap.get(sub.planId);
    return sum + (plan ? monthlyAmount(plan) : 0);
  }, 0);

  // Previous MRR (last month)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const { mrr: previousMRR } = calculateMRRAtDate(subscriptions, plans, lastMonth);

  // Revenue in last 30/90 days
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const totalRevenue30d = transactions
    .filter(
      (t) =>
        t.status === "succeeded" &&
        t.type === "payment" &&
        t.createdAt >= thirtyDaysAgo
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const totalRevenue90d = transactions
    .filter(
      (t) =>
        t.status === "succeeded" &&
        t.type === "payment" &&
        t.createdAt >= ninetyDaysAgo
    )
    .reduce((sum, t) => sum + t.amount, 0);

  // Churn rate
  const churnAnalysis = analyzeChurn(subscriptions, plans);

  // ARPU
  const arpu = activeSubs.length > 0 ? currentMRR / activeSubs.length : 0;

  // Annual Run Rate
  const annualRunRate = currentMRR * 12;

  // LTV (using churn rate)
  const ltv =
    churnAnalysis.churnRate > 0
      ? arpu / churnAnalysis.churnRate
      : arpu * 24;

  return {
    currentMRR,
    previousMRR,
    mrrChange: currentMRR - previousMRR,
    mrrChangePercent:
      previousMRR > 0 ? ((currentMRR - previousMRR) / previousMRR) * 100 : 0,
    totalRevenue30d,
    totalRevenue90d,
    activeSubscriptions: activeSubs.length,
    churnRate: churnAnalysis.churnRate,
    averageRevenuePerUser: arpu,
    annualRunRate,
    ltv,
  };
}
