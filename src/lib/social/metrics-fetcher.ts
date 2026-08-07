/** Social metrics sync — requires SocialAccount schema (future). */
export async function syncMetricsForAccount(_accountId: string) {
  return { synced: 0 };
}

export async function syncAllAccountMetrics(_tenantId: string) {
  return { totalSynced: 0 };
}
