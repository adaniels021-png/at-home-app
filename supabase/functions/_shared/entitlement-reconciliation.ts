const FRESHNESS_WINDOW_MS = 15 * 60 * 1000;

export function shouldUseCachedEntitlement(
  lastSyncedAt: string | null | undefined,
  force: boolean,
  now = Date.now()
): boolean {
  if (force || !lastSyncedAt) return false;

  const syncedAt = Date.parse(lastSyncedAt);
  return Number.isFinite(syncedAt) && now - syncedAt < FRESHNESS_WINDOW_MS;
}
