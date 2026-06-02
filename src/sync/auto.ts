import { isOnline } from '@/src/lib/network';
import { createLogger } from '@/src/lib/logger';

const logger = createLogger('sync');
let activeSync: Promise<unknown> | null = null;

export function scheduleSyncAfterLocalWrite(userId: string) {
  if (activeSync) {
    return;
  }

  activeSync = runWhenOnline(userId).finally(() => {
    activeSync = null;
  });
}

async function runWhenOnline(userId: string) {
  try {
    if (!(await isOnline())) {
      return;
    }

    const { syncLocalData } = await import('./sync');
    await syncLocalData(userId);
  } catch (error) {
    logger.error('background sync failed', error);
  }
}
