"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import Stripe from "stripe";

export type RevenueSubscriptionDTO = {
  id: string;
  project_id: string;
  customer_id: string;
  plan_id: string;
  status: "active" | "canceled" | "past_due" | "trialing";
  current_period_start: string;
  current_period_end: string | null;
  created_at: string;
  customer?: { id: string; email: string; name: string | null };
  plan?: { id: string; name: string; amount: number; currency: string; interval: string };
};

export type RevenueTransactionDTO = {
  id: string;
  project_id: string;
  customer_id: string;
  amount: number;
  currency: string;
  status: "succeeded" | "pending" | "failed" | "refunded";
  type: "payment" | "refund";
  created_at: string;
  customer?: { id: string; email: string; name: string | null };
};

export type MarketingCampaignDTO = {
  id: string;
  project_id: string;
  name: string;
  platform: string | null;
  status: string;
  budget: number;
  created_at: string;
};

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function getRevenueData() {
  const user = await requireAuth();

  const [subscriptions, transactionPage, campaigns, plans] = await Promise.all([
    prisma.revenueSubscription.findMany({
      where: { userId: user.id },
      include: { customer: true, plan: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    getTransactionsPaginated({ limit: 50 }),
    prisma.marketingCampaign.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.revenuePlan.findMany({
      where: { userId: user.id },
      orderBy: { amount: "asc" },
    }),
  ]);

  const transactions = transactionPage.items;

  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const mrr = activeSubs.reduce((acc, sub) => {
    const amount = sub.plan.amount;
    if (sub.plan.interval === "month") return acc + amount;
    if (sub.plan.interval === "year") return acc + amount / 12;
    if (sub.plan.interval === "week") return acc + amount * 4;
    return acc;
  }, 0);

  const totalRevenue = transactions
    .filter((t) => t.status === "succeeded" && t.type === "payment")
    .reduce((acc, t) => acc + t.amount, 0);

  return {
    stats: {
      mrr,
      totalRevenue,
      activeSubscriptions: activeSubs.length,
    },
    subscriptions: subscriptions.map((s) => ({
      id: s.id,
      project_id: "",
      customer_id: s.customerId,
      plan_id: s.planId,
      status: s.status as RevenueSubscriptionDTO["status"],
      current_period_start: s.currentPeriodStart.toISOString(),
      current_period_end: s.currentPeriodEnd?.toISOString() ?? null,
      created_at: s.createdAt.toISOString(),
      customer: s.customer
        ? { id: s.customer.id, email: s.customer.email, name: s.customer.name }
        : undefined,
      plan: s.plan
        ? {
            id: s.plan.id,
            name: s.plan.name,
            amount: s.plan.amount,
            currency: s.plan.currency,
            interval: s.plan.interval,
          }
        : undefined,
    })),
    transactions: transactionPage.items,
    campaigns: campaigns.map((c) => ({
      id: c.id,
      project_id: c.projectId ?? "",
      name: c.title,
      platform: c.channel,
      status: c.status,
      budget: c.budget,
      created_at: c.createdAt.toISOString(),
    })),
    plans,
    transactionsPagination: {
      nextCursor: transactionPage.nextCursor,
      hasMore: transactionPage.hasMore,
    },
  };
}

export type PaginatedTransactions = {
  items: RevenueTransactionDTO[];
  nextCursor: string | null;
  hasMore: boolean;
};

export async function getTransactionsPaginated(input?: {
  cursor?: string;
  limit?: number;
}): Promise<PaginatedTransactions> {
  const user = await requireAuth();
  const limit = Math.min(input?.limit ?? 25, 100);

  const rows = await prisma.transaction.findMany({
    where: { userId: user.id },
    include: { customer: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(input?.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return {
    items: page.map((t) => ({
      id: t.id,
      project_id: "",
      customer_id: t.customerId ?? "",
      amount: t.amount,
      currency: t.currency,
      status: t.status as RevenueTransactionDTO["status"],
      type: t.type as RevenueTransactionDTO["type"],
      created_at: t.createdAt.toISOString(),
      customer: t.customer
        ? { id: t.customer.id, email: t.customer.email, name: t.customer.name }
        : undefined,
    })),
    nextCursor: hasMore ? page[page.length - 1]!.id : null,
    hasMore,
  };
}

export async function createSampleRevenueData() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Sample revenue data is disabled in production");
  }
  const user = await requireAuth();

  const existing = await prisma.revenuePlan.count({ where: { userId: user.id } });
  if (existing > 0) return { created: false };

  const plan = await prisma.revenuePlan.create({
    data: {
      userId: user.id,
      name: "Pro Plan",
      amount: 29,
      currency: "USD",
      interval: "month",
    },
  });

  const customer = await prisma.revenueCustomer.create({
    data: {
      userId: user.id,
      email: "customer@example.com",
      name: "Sample Customer",
    },
  });

  await prisma.revenueSubscription.create({
    data: {
      userId: user.id,
      customerId: customer.id,
      planId: plan.id,
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.transaction.create({
    data: {
      userId: user.id,
      customerId: customer.id,
      amount: 29,
      currency: "USD",
      source: "manual",
      type: "payment",
      status: "succeeded",
    },
  });

  await prisma.marketingCampaign.create({
    data: {
      userId: user.id,
      title: "Launch Campaign",
      channel: "twitter",
      status: "active",
      budget: 500,
    },
  });

  revalidatePath("/dashboard/revenue");
  revalidatePath("/dashboard");
  return { created: true };
}

export async function createStripeCheckoutSession(planId: string) {
  const user = await requireAuth();
  const stripe = getStripe();
  if (!stripe) throw new Error("STRIPE_SECRET_KEY is not configured");

  const plan = await prisma.revenuePlan.findFirst({
    where: { id: planId, userId: user.id },
  });
  if (!plan) throw new Error("Plan not found");

  let priceId = plan.stripePriceId;
  if (!priceId) {
    const product = await stripe.products.create({ name: plan.name });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(plan.amount * 100),
      currency: plan.currency,
      recurring: { interval: plan.interval as "month" | "year" | "week" },
    });
    priceId = price.id;
    await prisma.revenuePlan.update({
      where: { id: plan.id },
      data: { stripePriceId: priceId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/revenue?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/revenue`,
    metadata: { userId: user.id, planId: plan.id },
  });

  return { url: session.url };
}

/** @deprecated Use lib/stripe/sync — kept for backward compatibility during migration */
export async function syncStripeSubscription(_stripeSubscriptionId: string) {
  throw new Error(
    "syncStripeSubscription is internal-only. Stripe sync runs via webhook handler."
  );
}
