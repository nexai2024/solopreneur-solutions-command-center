import type { PlatformAdapter, PublishResult } from '../publisher';
import { registerAdapter } from '../publisher';

const blueskyAdapter: PlatformAdapter = {
  async publish(content: string, mediaUrl?: string | null, accessToken?: string): Promise<PublishResult> {
    if (!accessToken) {
      return { success: false, error: 'No access token provided' };
    }

    // Placeholder: would use AT Protocol
    // POST https://bsky.social/xrpc/com.atproto.repo.createRecord
    return {
      success: true,
      externalId: `bs_${Date.now()}`,
      externalUrl: `https://bsky.app/profile/user/post/bs_${Date.now()}`,
    };
  },

  async deletePost(externalId: string, accessToken: string): Promise<boolean> {
    return true;
  },

  async getMetrics(externalId: string, accessToken: string) {
    return null;
  },
};

registerAdapter('BLUESKY', blueskyAdapter);

export default blueskyAdapter;
