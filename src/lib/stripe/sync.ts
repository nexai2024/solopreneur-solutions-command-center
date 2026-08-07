import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

/** Internal Stripe sync — not callable as a public server action. */
export async function syncStripeSubscription(stripeSubscriptionId: string): Promise<void> {
  const stripe = getStripe();
  if (!stripe) {
    logger.warn("Stripe sync skipped — STRIPE_SECRET_KEY not configured");
    return;
  }

  const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const userId = sub.metadata.userId;
  const planId = sub.metadata.planId;
  if (!userId || !planId) {
    logger.warn("Stripe subscription missing metadata", {
      stripeSubscriptionId,
      userId,
      planId,
    });
    return;
  }

  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!dbUser) {
    logger.error("Stripe subscription references unknown user", { userId, stripeSubscriptionId });
    return;
  }

  let customerEmail: string | null | undefined;
  if (typeof sub.customer === "string") {
    const customer = await stripe.customers.retrieve(sub.customer);
    if ("email" in customer) customerEmail = customer.email;
  } else if ("email" in sub.customer) {
    customerEmail = sub.customer.email;
  }

  if (!customerEmail) {
    logger.warn("Stripe subscription has no customer email", { stripeSubscriptionId });
    return;
  }

  let customer = await prisma.revenueCustomer.findFirst({
    where: { userId, email: customerEmail },
  });
  if (!customer) {
    customer = await prisma.revenueCustomer.create({
      data: { userId, email: customerEmail },
    });
  }

  const status = sub.status;
  await prisma.revenueSubscription.upsert({
    where: { stripeSubscriptionId },
    create: {
      userId,
      customerId: customer.id,
      planId,
      status,
      stripeSubscriptionId,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
    },
    update: {
      status,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
    },
  });

  const subscriptionStatus =
    status === "active" || status === "trialing"
      ? "pro"
      : status === "past_due"
        ? "past_due"
        : "free";

  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionStatus },
  });

  logger.info("Stripe subscription synced", { userId, stripeSubscriptionId, status });
  revalidatePath("/dashboard/revenue");
}

export async function handleSubscriptionDeleted(stripeSubscriptionId: string): Promise<void> {
  const stripe = getStripe();
  if (!stripe) return;

  const sub = await prisma.revenueSubscription.findFirst({
    where: { stripeSubscriptionId },
  });
  if (!sub) return;

  await prisma.revenueSubscription.update({
    where: { id: sub.id },
    data: { status: "canceled" },
  });

  await prisma.user.update({
    where: { id: sub.userId },
    data: { subscriptionStatus: "free" },
  });

  logger.info("Stripe subscription canceled", { stripeSubscriptionId, userId: sub.userId });
  revalidatePath("/dashboard/revenue");
}

export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const userId = invoice.subscription_details?.metadata?.userId ?? invoice.metadata?.userId;
  if (!userId || typeof userId !== "string") return;

  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionStatus: "past_due" },
  });

  logger.warn("Stripe invoice payment failed", {
    userId,
    invoiceId: invoice.id,
  });
  revalidatePath("/dashboard/revenue");
}

export async function recordStripeTransaction(
  paymentIntentId: string,
  userId: string,
  amount: number,
  currency: string,
  status: "succeeded" | "failed" | "refunded"
): Promise<void> {
  await prisma.transaction.upsert({
    where: { stripePaymentId: paymentIntentId },
    create: {
      userId,
      amount: amount / 100,
      currency: currency.toUpperCase(),
      source: "stripe",
      type: status === "refunded" ? "refund" : "payment",
      status,
      stripePaymentId: paymentIntentId,
    },
    update: { status },
  });
}
