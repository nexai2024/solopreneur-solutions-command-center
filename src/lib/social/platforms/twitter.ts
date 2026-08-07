import type { PlatformAdapter, PublishResult } from '../publisher';
import { registerAdapter } from '../publisher';

const twitterAdapter: PlatformAdapter = {
  async publish(content: string, mediaUrl?: string | null, accessToken?: string): Promise<PublishResult> {
    // Phase 1: Stub implementation
    // In production, this would use the Twitter API v2
    // POST https://api.twitter.com/2/tweets
    if (!accessToken) {
      return { success: false, error: 'No access token provided' };
    }

    // Placeholder: would make actual API call
    return {
      success: true,
      externalId: `tw_${Date.now()}`,
      externalUrl: `https://twitter.com/i/status/tw_${Date.now()}`,
    };
  },

  async deletePost(externalId: string, accessToken: string): Promise<boolean> {
    // DELETE https://api.twitter.com/2/tweets/:id
    return true;
  },

  async getMetrics(externalId: string, accessToken: string) {
    // GET https://api.twitter.com/2/tweets/:id?tweet.fields=public_metrics
    return null;
  },
};

registerAdapter('TWITTER', twitterAdapter);

export default twitterAdapter;
