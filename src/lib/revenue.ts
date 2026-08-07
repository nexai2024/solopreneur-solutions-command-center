export type {
  RevenueSubscriptionDTO as RevenueSubscription,
  RevenueTransactionDTO as RevenueTransaction,
  MarketingCampaignDTO as MarketingCampaign,
} from "@/lib/actions/revenue";

export type RevenuePlan = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  interval: string;
};

export type RevenueCustomer = {
  id: string;
  email: string;
  name: string | null;
};
