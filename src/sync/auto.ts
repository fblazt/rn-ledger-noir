import { isOnline } from '@/src/lib/network';

import { registerBackgroundSyncRunner } from './scheduler';
import { syncLocalData } from './sync';

registerBackgroundSyncRunner(async (userId) => {
  if (!(await isOnline())) {
    return;
  }

  await syncLocalData(userId);
});
