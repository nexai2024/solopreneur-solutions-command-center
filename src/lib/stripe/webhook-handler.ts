import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  syncStripeSubscription,
  handleSubscriptionDeleted,
  handleInvoicePaymentFailed,
  recordStripeTransaction,
} from "@/lib/stripe/sync";

async function isEventProcessed(eventId: string): Promise<boolean> {
  const existing = await prisma.stripeWebhookEvent.findUnique({
    where: { eventId },
  });
  return !!existing;
}

async function markEventProcessed(eventId: string, eventType: string): Promise<void> {
  await prisma.stripeWebhookEvent.create({
    data: { eventId, eventType },
  });
}

export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  if (await isEventProcessed(event.id)) {
    logger.info("Stripe event already processed (idempotent skip)", {
      eventId: event.id,
      eventType: event.type,
    });
    return;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.subscription) {
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
        await syncStripeSubscription(subId);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await syncStripeSubscription(subscription.id);
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription.id);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaymentFailed(invoice);
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const userId = charge.metadata?.userId;
      if (userId && charge.payment_intent && typeof charge.payment_intent === "string") {
        await recordStripeTransaction(
          charge.payment_intent,
          userId,
          charge.amount,
          charge.currency,
          "refunded"
        );
      }
      break;
    }
    default:
      logger.debug("Unhandled Stripe event type", { eventType: event.type });
  }

  await markEventProcessed(event.id, event.type);
}
