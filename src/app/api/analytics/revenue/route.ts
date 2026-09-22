import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateMRRHistory,
  analyzeChurn,
  forecastRevenue,
  analyzeCohorts,
  calculateRevenueSummary,
  type Subscription,
  type Transaction,
  type Plan,
} from "@/lib/revenue-analytics";
import { withRetry } from "@/lib/retry";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/revenue
 * Returns comprehensive revenue analytics for the authenticated user.
 * Query params:
 *   - months: number (default 12, max 24) - months of history
 *   - forecast: number (default 6, max 12) - months to forecast
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const months = Math.min(parseInt(searchParams.get("months") ?? "12"), 24);
    const forecastMonths = Math.min(parseInt(searchParams.get("forecast") ?? "6"), 12);

    // Fetch data from database with retry
    const [subscriptionsResult, transactionsResult, plansResult] = await Promise.all([
      withRetry(
        async () => {
          return prisma.revenueSubscription.findMany({
            where: { userId: user.id },
            include: { plan: true, customer: true },
            orderBy: { createdAt: "desc" },
            take: 200,
          });
        },
        { maxRetries: 2, baseDelayMs: 500, operationName: "fetch subscriptions" }
      ),
      withRetry(
        async () => {
          return prisma.transaction.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            take: 500,
          });
        },
        { maxRetries: 2, baseDelayMs: 500, operationName: "fetch transactions" }
      ),
      withRetry(
        async () => {
          return prisma.revenuePlan.findMany({
            where: { userId: user.id },
            orderBy: { amount: "asc" },
          });
        },
        { maxRetries: 2, baseDelayMs: 500, operationName: "fetch plans" }
      ),
    ]);

    if (!subscriptionsResult.success || !transactionsResult.success || !plansResult.success) {
      throw new Error("Failed to fetch revenue data");
    }

    // Convert to analytics types
    const subscriptions: Subscription[] = (subscriptionsResult.data ?? []).map((sub) => ({
      id: sub.id,
      status: sub.status as Subscription["status"],
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      canceledAt: null,
      planId: sub.planId,
      customerId: sub.customerId,
      createdAt: sub.createdAt,
    }));

    const transactions: Transaction[] = (transactionsResult.data ?? []).map((txn) => ({
      id: txn.id,
      amount: txn.amount,
      currency: txn.currency,
      status: txn.status as Transaction["status"],
      type: txn.type as Transaction["type"],
      createdAt: txn.createdAt,
      customerId: txn.customerId,
    }));

    const plans: Plan[] = (plansResult.data ?? []).map((plan) => ({
      id: plan.id,
      name: plan.name,
      amount: plan.amount,
      currency: plan.currency,
      interval: plan.interval as Plan["interval"],
    }));

    // Calculate analytics
    const mrrHistory = calculateMRRHistory(subscriptions, plans, months);
    const churnAnalysis = analyzeChurn(subscriptions, plans);
    const forecast = forecastRevenue(subscriptions, plans, forecastMonths);
    const cohorts = analyzeCohorts(subscriptions, Math.min(months, 6));
    const summary = calculateRevenueSummary(transactions, subscriptions, plans);

    return NextResponse.json({
      success: true,
      data: {
        summary,
        mrrHistory,
        churnAnalysis,
        forecast,
        cohorts,
        planCount: plans.length,
        subscriptionCount: subscriptions.length,
        transactionCount: transactions.length,
      },
    });
  } catch (error) {
    console.error("Revenue analytics error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
