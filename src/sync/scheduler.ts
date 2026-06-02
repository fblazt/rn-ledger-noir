import { createLogger } from '@/src/lib/logger';

const logger = createLogger('sync');
let activeSync: Promise<unknown> | null = null;
let syncRunner: ((userId: string) => Promise<void>) | null = null;

export function registerBackgroundSyncRunner(runner: (userId: string) => Promise<void>) {
  syncRunner = runner;
}

export function scheduleSyncAfterLocalWrite(userId: string) {
  if (activeSync || !syncRunner) {
    return;
  }

  activeSync = syncRunner(userId)
    .catch((error) => {
      logger.error('background sync failed', error);
    })
    .finally(() => {
      activeSync = null;
    });
}
