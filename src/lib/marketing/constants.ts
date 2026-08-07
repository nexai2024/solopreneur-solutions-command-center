import type { MarketingTab, SocialPlatform, NewsletterBlockType, CalendarEntryType } from './types';

export const MARKETING_TABS: { key: MarketingTab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: 'LayoutDashboard' },
  { key: 'calendar', label: 'Calendar', icon: 'Calendar' },
  { key: 'newsletters', label: 'Newsletters', icon: 'Mail' },
  { key: 'social', label: 'Social', icon: 'Share2' },
  { key: 'blog', label: 'Blog', icon: 'FileText' },
  { key: 'analytics', label: 'Analytics', icon: 'BarChart3' },
];

export const SOCIAL_PLATFORMS: { key: SocialPlatform; label: string; color: string; maxLength: number }[] = [
  { key: 'TWITTER', label: 'Twitter/X', color: '#1DA1F2', maxLength: 280 },
  { key: 'LINKEDIN', label: 'LinkedIn', color: '#0077B5', maxLength: 3000 },
  { key: 'THREADS', label: 'Threads', color: '#000000', maxLength: 500 },
  { key: 'BLUESKY', label: 'Bluesky', color: '#0085FF', maxLength: 300 },
  { key: 'MASTODON', label: 'Mastodon', color: '#6364FF', maxLength: 500 },
  { key: 'OTHER', label: 'Other', color: '#64748B', maxLength: 5000 },
];

export const NEWSLETTER_BLOCK_TYPES: { type: NewsletterBlockType; label: string; icon: string }[] = [
  { type: 'header', label: 'Header', icon: 'Heading' },
  { type: 'text', label: 'Text', icon: 'Type' },
  { type: 'image', label: 'Image', icon: 'Image' },
  { type: 'button', label: 'Button', icon: 'MousePointer' },
  { type: 'columns', label: 'Columns', icon: 'Columns' },
  { type: 'divider', label: 'Divider', icon: 'Minus' },
  { type: 'spacer', label: 'Spacer', icon: 'MoveVertical' },
  { type: 'social-links', label: 'Social Links', icon: 'Share2' },
  { type: 'video', label: 'Video', icon: 'Video' },
  { type: 'footer', label: 'Footer', icon: 'AlignEndVertical' },
  { type: 'html', label: 'HTML', icon: 'Code' },
];

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400',
  SCHEDULED: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  PUBLISHED: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  SENT: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  ACTIVE: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  PAUSED: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
  ENDED: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
  ARCHIVED: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-500',
  FAILED: 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  PUBLISHING: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
  PLANNED: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400',
  IN_PROGRESS: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  COMPLETED: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  CANCELLED: 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400',
};

export const CALENDAR_TYPE_COLORS: Record<CalendarEntryType, string> = {
  BLOG_POST: '#10b981',    // emerald
  SOCIAL_POST: '#3b82f6',  // blue
  NEWSLETTER: '#8b5cf6',   // purple
  AD_CAMPAIGN: '#f97316',  // orange
  CUSTOM: '#64748b',       // slate
};

export const CALENDAR_TYPE_LABELS: Record<CalendarEntryType, string> = {
  BLOG_POST: 'Blog',
  SOCIAL_POST: 'Social',
  NEWSLETTER: 'Newsletter',
  AD_CAMPAIGN: 'Campaign',
  CUSTOM: 'Custom',
};

export const DEFAULT_NEWSLETTER_BLOCKS = {
  version: 1,
  blocks: [],
  globalStyles: {
    backgroundColor: '#ffffff',
    fontFamily: 'Arial, sans-serif',
    maxWidth: 600,
  },
};

export const TONE_OPTIONS = [
  { value: 'casual', label: 'Casual' },
  { value: 'professional', label: 'Professional' },
  { value: 'humorous', label: 'Humorous' },
  { value: 'inspiring', label: 'Inspiring' },
  { value: 'educational', label: 'Educational' },
  { value: 'persuasive', label: 'Persuasive' },
];
