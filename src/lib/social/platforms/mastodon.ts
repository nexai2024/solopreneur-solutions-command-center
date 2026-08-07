import type { PlatformAdapter, PublishResult } from '../publisher';
import { registerAdapter } from '../publisher';

const mastodonAdapter: PlatformAdapter = {
  async publish(content: string, mediaUrl?: string | null, accessToken?: string): Promise<PublishResult> {
    if (!accessToken) {
      return { success: false, error: 'No access token provided' };
    }

    // Placeholder: would use Mastodon API
    // POST https://{instance}/api/v1/statuses
    return {
      success: true,
      externalId: `ma_${Date.now()}`,
      externalUrl: `https://mastodon.social/@user/ma_${Date.now()}`,
    };
  },

  async deletePost(externalId: string, accessToken: string): Promise<boolean> {
    return true;
  },

  async getMetrics(externalId: string, accessToken: string) {
    return null;
  },
};

registerAdapter('MASTODON', mastodonAdapter);

export default mastodonAdapter;
