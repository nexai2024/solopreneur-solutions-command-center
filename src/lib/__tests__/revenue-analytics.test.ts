import { describe, expect, it } from "vitest";
import {
  calculateMRRHistory,
  analyzeChurn,
  forecastRevenue,
  analyzeCohorts,
  calculateRevenueSummary,
  type Transaction,
  type Subscription,
  type Plan,
} from "@/lib/revenue-analytics";

const samplePlans: Plan[] = [
  { id: "plan-1", name: "Starter", amount: 19, currency: "USD", interval: "month" },
  { id: "plan-2", name: "Pro", amount: 49, currency: "USD", interval: "month" },
  { id: "plan-3", name: "Annual", amount: 399, currency: "USD", interval: "year" },
];

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub-1",
    status: "active",
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    canceledAt: null,
    planId: "plan-1",
    customerId: "cust-1",
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    ...overrides,
  };
}

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "txn-1",
    amount: 49,
    currency: "USD",
    status: "succeeded",
    type: "payment",
    createdAt: new Date(),
    customerId: "cust-1",
    ...overrides,
  };
}

describe("calculateMRRHistory", () => {
  it("returns data points for each month", () => {
    const result = calculateMRRHistory([], [], 6);
    expect(result).toHaveLength(6);
  });

  it("calculates MRR from active subscriptions", () => {
    const subs = [makeSub({ planId: "plan-2" })];
    const result = calculateMRRHistory(subs, samplePlans, 1);
    expect(result[0]!.mrr).toBe(49);
  });

  it("handles annual plans correctly", () => {
    const subs = [makeSub({ planId: "plan-3" })];
    const result = calculateMRRHistory(subs, samplePlans, 1);
    expect(result[0]!.mrr).toBeCloseTo(33.25, 1);
  });
});

describe("analyzeChurn", () => {
  it("calculates churn rate", () => {
    const subs = [
      makeSub({ id: "sub-1", status: "active" }),
      makeSub({ id: "sub-2", status: "canceled", canceledAt: new Date() }),
    ];
    const result = analyzeChurn(subs, samplePlans);
    expect(result.churnRate).toBe(0.5);
    expect(result.totalCanceled).toBe(1);
  });

  it("handles zero subscriptions", () => {
    const result = analyzeChurn([], []);
    expect(result.churnRate).toBe(0);
    expect(result.totalCanceled).toBe(0);
  });
});

describe("forecastRevenue", () => {
  it("returns forecast for requested months", () => {
    const subs = [makeSub({ planId: "plan-2" })];
    const result = forecastRevenue(subs, samplePlans, 6);
    expect(result.months).toHaveLength(6);
    expect(result.assumptions.averageRevenuePerUser).toBe(49);
  });

  it("includes optimistic and pessimistic scenarios", () => {
    const subs = [makeSub({ planId: "plan-2" })];
    const result = forecastRevenue(subs, samplePlans, 1);
    const month = result.months[0]!;
    expect(month.optimistic).toBeGreaterThanOrEqual(month.projected);
    expect(month.pessimistic).toBeLessThanOrEqual(month.projected);
  });
});

describe("analyzeCohorts", () => {
  it("groups subscriptions by cohort month", () => {
    const now = new Date();
    const subs = [
      makeSub({ id: "sub-1", createdAt: new Date(now.getFullYear(), now.getMonth(), 15) }),
      makeSub({ id: "sub-2", createdAt: new Date(now.getFullYear(), now.getMonth(), 20) }),
    ];
    const result = analyzeCohorts(subs, 3);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]!.initialCount).toBe(2);
  });
});

describe("calculateRevenueSummary", () => {
  it("calculates summary stats", () => {
    const subs = [
      makeSub({ planId: "plan-2" }),
      makeSub({ id: "sub-2", planId: "plan-1" }),
    ];
    const txns = [
      makeTransaction({ amount: 49 }),
      makeTransaction({ id: "txn-2", amount: 19 }),
    ];
    const result = calculateRevenueSummary(txns, subs, samplePlans);
    expect(result.currentMRR).toBe(68);
    expect(result.activeSubscriptions).toBe(2);
    expect(result.averageRevenuePerUser).toBe(34);
    expect(result.annualRunRate).toBe(816);
  });
});
