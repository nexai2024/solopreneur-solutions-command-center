import type { SocialPlatform } from '@/lib/marketing/types';

export interface PublishResult {
  success: boolean;
  externalId?: string;
  externalUrl?: string;
  error?: string;
}

export interface PlatformAdapter {
  publish(content: string, mediaUrl?: string | null, accessToken?: string): Promise<PublishResult>;
  deletePost(externalId: string, accessToken: string): Promise<boolean>;
  getMetrics(externalId: string, accessToken: string): Promise<{
    likes: number;
    shares: number;
    comments: number;
    impressions: number;
    clicks: number;
  } | null>;
}

// Platform adapter registry
const adapters: Partial<Record<SocialPlatform, PlatformAdapter>> = {};

export function registerAdapter(platform: SocialPlatform, adapter: PlatformAdapter) {
  adapters[platform] = adapter;
}

export function getAdapter(platform: SocialPlatform): PlatformAdapter | null {
  return adapters[platform] || null;
}

export async function publishToplatform(
  platform: SocialPlatform,
  content: string,
  mediaUrl?: string | null,
  accessToken?: string
): Promise<PublishResult> {
  const adapter = getAdapter(platform);
  if (!adapter) {
    return { success: false, error: `No adapter registered for ${platform}` };
  }

  try {
    return await adapter.publish(content, mediaUrl, accessToken);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown publishing error',
    };
  }
}
