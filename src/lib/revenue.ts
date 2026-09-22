// This file contains legacy revenue types that have been migrated.
// All functionality is now in @/lib/actions/revenue

/**
 * @deprecated Use types from @/lib/actions/revenue instead
 */
export type {
  RevenueSubscriptionDTO as RevenueSubscription,
  RevenueTransactionDTO as RevenueTransaction,
  MarketingCampaignDTO as MarketingCampaign,
} from "@/lib/actions/revenue";

/**
 * @deprecated Legacy revenue plan type - use @/lib/actions/revenue.RevenuePlanDTO
 */
export interface RevenuePlan {
  id: string;
  name: string;
  amount: number;
  currency: string;
  interval: string;
  stripePriceId?: string;
}

export interface RevenueCustomer {
  id: string;
  email: string;
  name: string | null;
  stripeCustomerId?: string;
}


