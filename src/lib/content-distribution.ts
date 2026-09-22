/**
 * Multi-channel Content Distribution Automation
 *
 * Pure-TypeScript engine for scheduling, queuing, and tracking content
 * distribution across multiple channels (blog, social, newsletter, etc.).
 * No AI calls — deterministic scheduling and queue management.
 */

export type DistributionChannel =
  | "twitter"
  | "linkedin"
  | "reddit"
  | "blog"
  | "newsletter"
  | "mastodon"
  | "threads";

export type ContentItem = {
  id: string;
  projectId: string;
  title: string;
  body: string | null;
  channel: DistributionChannel;
  status: "draft" | "scheduled" | "queued" | "publishing" | "published" | "failed";
  scheduledAt: Date | null;
  publishedAt: Date | null;
  retryCount: number;
  maxRetries: number;
  metadata: Record<string, unknown>;
};

export type DistributionSchedule = {
  channel: DistributionChannel;
  optimalHours: number[];
  cooldownMinutes: number;
  maxPerDay: number;
};

export type QueuedItem = {
  item: ContentItem;
  scheduledFor: Date;
  priority: number;
  attempts: number;
};

export type DistributionResult = {
  success: boolean;
  channelId: string;
  publishedAt: Date | null;
  error?: string;
  retryAfter?: Date;
};

export type ChannelAnalytics = {
  channel: DistributionChannel;
  totalPublished: number;
  totalFailed: number;
  averageEngagement: number;
  lastPublishedAt: Date | null;
  nextAvailableSlot: Date | null;
};

// --- Channel Configuration ---

const CHANNEL_CONFIGS: Record<DistributionChannel, DistributionSchedule> = {
  twitter: {
    channel: "twitter",
    optimalHours: [9, 12, 17, 20],
    cooldownMinutes: 60,
    maxPerDay: 5,
  },
  linkedin: {
    channel: "linkedin",
    optimalHours: [8, 10, 12, 17],
    cooldownMinutes: 120,
    maxPerDay: 3,
  },
  reddit: {
    channel: "reddit",
    optimalHours: [9, 13, 18],
    cooldownMinutes: 240,
    maxPerDay: 2,
  },
  blog: {
    channel: "blog",
    optimalHours: [10],
    cooldownMinutes: 1440,
    maxPerDay: 1,
  },
  newsletter: {
    channel: "newsletter",
    optimalHours: [8, 10],
    cooldownMinutes: 10080,
    maxPerDay: 1,
  },
  mastodon: {
    channel: "mastodon",
    optimalHours: [9, 13, 18],
    cooldownMinutes: 60,
    maxPerDay: 5,
  },
  threads: {
    channel: "threads",
    optimalHours: [9, 12, 19],
    cooldownMinutes: 60,
    maxPerDay: 3,
  },
};

// --- Content Length Limits ---

const CONTENT_LIMITS: Record<DistributionChannel, { maxTitle: number; maxBody: number }> = {
  twitter: { maxTitle: 280, maxBody: 280 },
  linkedin: { maxTitle: 200, maxBody: 3000 },
  reddit: { maxTitle: 300, maxBody: 40000 },
  blog: { maxTitle: 200, maxBody: 50000 },
  newsletter: { maxTitle: 200, maxBody: 10000 },
  mastodon: { maxTitle: 500, maxBody: 500 },
  threads: { maxTitle: 500, maxBody: 500 },
};

// --- Core Functions ---

export function getChannelConfig(channel: DistributionChannel): DistributionSchedule {
  return CHANNEL_CONFIGS[channel];
}

export function getContentLimits(channel: DistributionChannel) {
  return CONTENT_LIMITS[channel];
}

/**
 * Calculate optimal posting time for a channel
 */
export function getOptimalPostTime(
  channel: DistributionChannel,
  preferredDate?: Date
): Date {
  const config = CHANNEL_CONFIGS[channel];
  const date = preferredDate ?? new Date();
  const now = new Date();

  // Find next optimal hour
  for (const hour of config.optimalHours) {
    const candidate = new Date(date);
    candidate.setHours(hour, 0, 0, 0);

    if (candidate > now) {
      return candidate;
    }
  }

  // All hours passed today, use first slot tomorrow
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(config.optimalHours[0]!, 0, 0, 0);
  return tomorrow;
}

/**
 * Validate content for a specific channel
 */
export function validateContent(
  content: ContentItem
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const limits = CONTENT_LIMITS[content.channel];

  if (!content.title || content.title.trim().length === 0) {
    errors.push("Title is required");
  }

  if (content.title && content.title.length > limits.maxTitle) {
    errors.push(`Title exceeds ${limits.maxTitle} character limit for ${content.channel}`);
  }

  if (content.body && content.body.length > limits.maxBody) {
    errors.push(`Content exceeds ${limits.maxBody} character limit for ${content.channel}`);
  }

  if (!content.body || content.body.trim().length === 0) {
    errors.push("Content body is required");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Trim content to fit channel limits
 */
export function trimContentForChannel(
  content: string,
  channel: DistributionChannel
): string {
  const limits = CONTENT_LIMITS[channel];
  if (content.length <= limits.maxBody) {
    return content;
  }

  // Trim and add ellipsis
  const trimmed = content.slice(0, limits.maxBody - 3);
  return `${trimmed}...`;
}

/**
 * Schedule content for optimal posting time
 */
export function scheduleContent(
  items: ContentItem[],
  targetChannels: DistributionChannel[],
  startDate?: Date
): Map<DistributionChannel, Date> {
  const schedule = new Map<DistributionChannel, Date>();
  const start = startDate ?? new Date();

  for (const channel of targetChannels) {
    const config = CHANNEL_CONFIGS[channel];
    const channelItems = items.filter(
      (item) => item.channel === channel && item.status === "scheduled"
    );

    // Find next available slot
    let candidateDate = new Date(start);
    let dayOffset = 0;

    while (true) {
      const testDate = new Date(candidateDate);
      testDate.setDate(testDate.getDate() + dayOffset);

      for (const hour of config.optimalHours) {
        const slot = new Date(testDate);
        slot.setHours(hour, 0, 0, 0);

        // Check if slot is available (not too close to existing posts)
        const tooClose = channelItems.some((item) => {
          if (!item.scheduledAt) return false;
          const diff = Math.abs(slot.getTime() - item.scheduledAt.getTime());
          return diff < config.cooldownMinutes * 60 * 1000;
        });

        if (!tooClose && slot > new Date()) {
          schedule.set(channel, slot);
          break;
        }
      }

      if (schedule.has(channel) || dayOffset > 7) {
        break;
      }
      dayOffset++;
    }
  }

  return schedule;
}

/**
 * Create a distribution queue with priority ordering
 */
export function createDistributionQueue(
  items: ContentItem[]
): QueuedItem[] {
  const queue: QueuedItem[] = [];

  for (const item of items) {
    if (item.status !== "scheduled" && item.status !== "queued") {
      continue;
    }

    // Priority scoring
    let priority = 0;
    if (item.scheduledAt) {
      const timeDiff = item.scheduledAt.getTime() - Date.now();
      // Higher priority for sooner items
      priority += Math.max(0, 100 - timeDiff / (60 * 60 * 1000));
    }

    // Boost for retries
    priority += item.retryCount * 10;

    // Boost for high-engagement channels
    if (["twitter", "linkedin"].includes(item.channel)) {
      priority += 5;
    }

    queue.push({
      item,
      scheduledFor: item.scheduledAt ?? new Date(),
      priority,
      attempts: item.retryCount,
    });
  }

  // Sort by priority (highest first)
  return queue.sort((a, b) => b.priority - a.priority);
}

/**
 * Process next item in queue
 */
export function processNextInQueue(
  queue: QueuedItem[]
): { item: QueuedItem; remaining: QueuedItem[] } | null {
  const now = new Date();
  const readyIndex = queue.findIndex((q) => q.scheduledFor <= now);

  if (readyIndex === -1) {
    return null;
  }

  const item = queue[readyIndex]!;
  const remaining = [...queue.slice(0, readyIndex), ...queue.slice(readyIndex + 1)];

  return { item, remaining };
}

/**
 * Handle failed distribution with retry logic
 */
export function handleDistributionFailure(
  item: ContentItem,
  error: string
): { shouldRetry: boolean; retryAfter?: Date; finalError?: string } {
  if (item.retryCount >= item.maxRetries) {
    return {
      shouldRetry: false,
      finalError: `Failed after ${item.maxRetries} retries: ${error}`,
    };
  }

  // Exponential backoff: 5min, 15min, 45min, ...
  const backoffMinutes = 5 * Math.pow(3, item.retryCount);
  const retryAfter = new Date(Date.now() + backoffMinutes * 60 * 1000);

  return {
    shouldRetry: true,
    retryAfter,
  };
}

/**
 * Calculate channel analytics
 */
export function calculateChannelAnalytics(
  items: ContentItem[],
  channel: DistributionChannel
): ChannelAnalytics {
  const channelItems = items.filter((item) => item.channel === channel);
  const published = channelItems.filter((item) => item.status === "published");
  const failed = channelItems.filter((item) => item.status === "failed");

  const lastPublished = published.length > 0
    ? published.reduce((latest, item) =>
        item.publishedAt && item.publishedAt > latest ? item.publishedAt : latest
      , new Date(0))
    : null;

  // Calculate next available slot
  const config = CHANNEL_CONFIGS[channel];
  const now = new Date();
  let nextSlot: Date | null = null;

  if (lastPublished) {
    const cooldownEnd = new Date(lastPublished.getTime() + config.cooldownMinutes * 60 * 1000);
    if (cooldownEnd > now) {
      nextSlot = cooldownEnd;
    }
  }

  return {
    channel,
    totalPublished: published.length,
    totalFailed: failed.length,
    averageEngagement: 0,
    lastPublishedAt: lastPublished,
    nextAvailableSlot: nextSlot,
  };
}

/**
 * Generate a cross-posting schedule for multiple channels
 */
export function generateCrossPostSchedule(
  content: string,
  title: string,
  channels: DistributionChannel[],
  baseDate?: Date
): Array<{ channel: DistributionChannel; scheduledAt: Date; adaptedContent: string }> {
  const schedule: Array<{
    channel: DistributionChannel;
    scheduledAt: Date;
    adaptedContent: string;
  }> = [];

  const start = baseDate ?? new Date();

  for (let i = 0; i < channels.length; i++) {
    const channel = channels[i]!;
    const limits = CONTENT_LIMITS[channel];
    const config = CHANNEL_CONFIGS[channel];

    // Calculate staggered posting time
    const staggerMinutes = i * config.cooldownMinutes;
    const scheduledAt = new Date(start.getTime() + staggerMinutes * 60 * 1000);

    // Adapt content for channel
    let adaptedContent = content;
    if (content.length > limits.maxBody) {
      adaptedContent = trimContentForChannel(content, channel);
    }

    // Add channel-specific formatting
    if (channel === "twitter" && adaptedContent.length > 240) {
      adaptedContent = `${adaptedContent.slice(0, 237)}...`;
    }

    schedule.push({
      channel,
      scheduledAt,
      adaptedContent,
    });
  }

  return schedule;
}
