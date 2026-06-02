import { useFocusEffect } from '@react-navigation/native';
import { useState } from 'react';

import { useAuth } from '@/src/auth';

import { getLocalSyncSummary } from './local';
import type { SyncSummary } from './types';

export function useSyncSummary() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<SyncSummary | null>(null);

  async function refresh() {
    if (!user) {
      setSummary(null);
      return;
    }

    setSummary(await getLocalSyncSummary(user.id));
  }

  useFocusEffect(() => {
    refresh();
    const intervalId = setInterval(refresh, 5000);

    return () => clearInterval(intervalId);
  });

  return { refresh, summary, status: summary?.status ?? 'idle' };
}
