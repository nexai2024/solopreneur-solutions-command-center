import type { PlatformAdapter, PublishResult } from '../publisher';
import { registerAdapter } from '../publisher';

const linkedinAdapter: PlatformAdapter = {
  async publish(content: string, mediaUrl?: string | null, accessToken?: string): Promise<PublishResult> {
    if (!accessToken) {
      return { success: false, error: 'No access token provided' };
    }

    // Placeholder: would use LinkedIn API
    // POST https://api.linkedin.com/v2/shares
    return {
      success: true,
      externalId: `li_${Date.now()}`,
      externalUrl: `https://linkedin.com/feed/update/li_${Date.now()}`,
    };
  },

  async deletePost(externalId: string, accessToken: string): Promise<boolean> {
    return true;
  },

  async getMetrics(externalId: string, accessToken: string) {
    return null;
  },
};

registerAdapter('LINKEDIN', linkedinAdapter);

export default linkedinAdapter;
