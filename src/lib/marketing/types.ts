// Shared TypeScript types for all marketing models

export type MarketingTab = 'overview' | 'calendar' | 'newsletters' | 'social' | 'blog' | 'analytics';

// Blog types
export interface BlogPostData {
  id: string;
  title: string;
  slug: string;
  content: TiptapContent | null;
  excerpt: string | null;
  status: BlogPostStatus;
  featuredImage: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[];
  canonicalUrl: string | null;
  publishAt: string | null;
  publishedAt: string | null;
  viewCount: number;
  productId: string | null;
  createdAt: string;
  updatedAt: string;
  Categories?: { Category: BlogCategoryData }[];
  Tags?: { Tag: BlogTagData }[];
  Product?: { id: string; name: string } | null;
}

export type BlogPostStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';

export interface BlogCategoryData {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export interface BlogTagData {
  id: string;
  name: string;
  slug: string;
}

export interface TiptapContent {
  type: string;
  content?: TiptapNode[];
}

export interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

// Newsletter types
export interface NewsletterData {
  id: string;
  name: string;
  subject: string;
  body: string;
  blocks: NewsletterBlocksData | null;
  templateId: string | null;
  previewText: string | null;
  fromName: string | null;
  fromEmail: string | null;
  status: NewsletterStatus;
  audienceType: string;
  productId: string | null;
  scheduledFor: string | null;
  sentAt: string | null;
  recipientCount: number | null;
  openRate: number | null;
  clickRate: number | null;
  unsubscribeCount: number | null;
  bounceCount: number | null;
  createdAt: string;
  updatedAt: string;
  Product?: { id: string; name: string } | null;
}

export type NewsletterStatus = 'DRAFT' | 'SCHEDULED' | 'SENT';

export interface NewsletterBlocksData {
  version: number;
  blocks: NewsletterBlock[];
  globalStyles: {
    backgroundColor: string;
    fontFamily: string;
    maxWidth: number;
  };
}

export interface NewsletterBlock {
  id: string;
  type: NewsletterBlockType;
  content: Record<string, unknown>;
  styles: Record<string, unknown>;
}

export type NewsletterBlockType =
  | 'text'
  | 'image'
  | 'button'
  | 'columns'
  | 'divider'
  | 'spacer'
  | 'social-links'
  | 'video'
  | 'header'
  | 'footer'
  | 'html';

export interface NewsletterTemplateData {
  id: string;
  name: string;
  blocks: NewsletterBlocksData | null;
  thumbnail: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriberData {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: SubscriberStatus;
  source: string | null;
  createdAt: string;
  updatedAt: string;
  Lists?: { List: NewsletterListData }[];
}

export type SubscriberStatus = 'ACTIVE' | 'UNSUBSCRIBED' | 'BOUNCED' | 'COMPLAINED';

export interface NewsletterListData {
  id: string;
  name: string;
  description: string | null;
  color: string;
  _count?: { Subscribers: number };
}

// Social types
export interface SocialPostData {
  id: string;
  platform: SocialPlatform;
  content: string;
  mediaUrl: string | null;
  status: SocialPostStatus;
  productId: string | null;
  socialAccountId: string | null;
  externalId: string | null;
  scheduledFor: string | null;
  publishedAt: string | null;
  externalUrl: string | null;
  likes: number | null;
  shares: number | null;
  comments: number | null;
  impressions: number | null;
  clicks: number | null;
  parentPostId: string | null;
  threadOrder: number | null;
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
  Product?: { id: string; name: string } | null;
  SocialAccount?: SocialAccountData | null;
  ThreadReplies?: SocialPostData[];
}

export type SocialPlatform = 'TWITTER' | 'LINKEDIN' | 'THREADS' | 'BLUESKY' | 'MASTODON' | 'OTHER';
export type SocialPostStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';

export interface SocialAccountData {
  id: string;
  platform: SocialPlatform;
  accountName: string;
  accountId: string | null;
  isConnected: boolean;
  tokenExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Calendar types
export interface CalendarEntryData {
  id: string;
  title: string;
  entryType: CalendarEntryType;
  date: string;
  color: string | null;
  status: CalendarEntryStatus;
  blogPostId: string | null;
  socialPostId: string | null;
  newsletterId: string | null;
  adCampaignId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CalendarEntryType = 'BLOG_POST' | 'SOCIAL_POST' | 'NEWSLETTER' | 'AD_CAMPAIGN' | 'CUSTOM';
export type CalendarEntryStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: CalendarEntryType;
  status: string;
  color: string;
  sourceId?: string;
  sourceType?: string;
}

// Analytics types
export interface AnalyticsOverview {
  totalSubscribers: number;
  totalBlogViews: number;
  totalSocialPosts: number;
  totalNewslettersSent: number;
  subscriberGrowth: number;
  avgOpenRate: number;
  avgClickRate: number;
  totalEngagement: number;
}

export interface MarketingAnalyticsEventData {
  id: string;
  eventType: string;
  source: string;
  sourceId: string | null;
  metric: string;
  value: number;
  date: string;
  metadata: Record<string, unknown> | null;
}

// AI types
export interface BrandVoiceData {
  id: string;
  name: string;
  toneKeywords: string[];
  avoidKeywords: string[];
  sampleContent: string | null;
  targetAudience: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AIContentGenerationData {
  id: string;
  contentType: AIContentType;
  prompt: string;
  result: string;
  model: string;
  tokensUsed: number | null;
  rating: number | null;
  wasUsed: boolean;
  createdAt: string;
}

export type AIContentType =
  | 'BLOG_POST'
  | 'NEWSLETTER'
  | 'AD_COPY'
  | 'SOCIAL_POST'
  | 'SOCIAL_REPLY'
  | 'SEO_OPTIMIZATION'
  | 'AB_VARIANT'
  | 'CALENDAR_PLAN'
  | 'HASHTAGS'
  | 'BRAND_REWRITE';

// Ad Campaign types (existing, re-exported for convenience)
export interface AdCampaignData {
  id: string;
  name: string;
  platform: string;
  status: string;
  budgetCents: number | null;
  spendCents: number | null;
  resultClicks: number | null;
  resultSignups: number | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  Product?: { id: string; name: string } | null;
}

// Shared
export interface DateRange {
  from: Date;
  to: Date;
}

export interface ProductOption {
  id: string;
  name: string;
}
