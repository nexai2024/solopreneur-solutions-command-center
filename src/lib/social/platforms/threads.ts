import type { PlatformAdapter, PublishResult } from '../publisher';
import { registerAdapter } from '../publisher';

const threadsAdapter: PlatformAdapter = {
  async publish(content: string, mediaUrl?: string | null, accessToken?: string): Promise<PublishResult> {
    if (!accessToken) {
      return { success: false, error: 'No access token provided' };
    }

    // Placeholder: would use Threads API (Meta)
    return {
      success: true,
      externalId: `th_${Date.now()}`,
      externalUrl: `https://threads.net/post/th_${Date.now()}`,
    };
  },

  async deletePost(externalId: string, accessToken: string): Promise<boolean> {
    return true;
  },

  async getMetrics(externalId: string, accessToken: string) {
    return null;
  },
};

registerAdapter('THREADS', threadsAdapter);

export default threadsAdapter;
