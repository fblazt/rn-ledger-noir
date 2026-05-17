import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useAuth } from '@/src/auth';
import { FormError, Screen, SyncBadge } from '@/src/components/ui';
import { initializeDatabase, listDefaultCategories, seedDefaultCategories } from '@/src/db';
import { verifyBasicLocalWrites } from '@/src/db/smoke';
import { createLogger } from '@/src/lib/logger';
import { getLocalSyncSummary, syncLocalData } from '@/src/sync';
import type { SyncSummary } from '@/src/sync';

const logger = createLogger('settings');
const DEV_SMOKE_USER_ID = '00000000-0000-4000-8000-000000000003';
const syncEntityLabels = {
  budget: 'Budgets',
  category: 'Categories',
  transaction: 'Transactions',
  transaction_attachment: 'Receipts',
} as const;

export default function SettingsScreen() {
  const { setupStatus, signOut, user } = useAuth();
  const [logoutStatus, setLogoutStatus] = useState<'idle' | 'running' | 'failed'>('idle');
  const [smokeStatus, setSmokeStatus] = useState<'idle' | 'running' | 'passed' | 'failed'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'running' | 'synced' | 'failed'>('idle');
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setSyncSummary(null);
        return;
      }

      refreshSyncSummary(user.id);
    }, [user])
  );

  async function submitLogout() {
    setLogoutStatus('running');

    try {
      await signOut();
      setLogoutStatus('idle');
    } catch (error) {
      logger.error('logout failed', error);
      setLogoutStatus('failed');
    }
  }

  async function refreshSyncSummary(userId: string) {
    try {
      setSyncSummary(await getLocalSyncSummary(userId));
    } catch (error) {
      logger.error('failed to load sync summary', error);
    }
  }

  async function runManualSync() {
    if (!user) {
      setSyncError('Log in before syncing local data.');
      return;
    }

    setSyncStatus('running');
    setSyncError(null);

    try {
      await syncLocalData(user.id);
      await refreshSyncSummary(user.id);
      setSyncStatus('synced');
    } catch (error) {
      logger.error('manual sync failed', error);
      await refreshSyncSummary(user.id);
      setSyncError(error instanceof Error ? error.message : 'Sync failed. Try again.');
      setSyncStatus('failed');
    }
  }

  async function runLocalSmokeTest() {
    setSmokeStatus('running');

    try {
      const db = await initializeDatabase();

      await seedDefaultCategories(db, DEV_SMOKE_USER_ID);
      await seedDefaultCategories(db, DEV_SMOKE_USER_ID);

      const categories = await listDefaultCategories(db, DEV_SMOKE_USER_ID);
      const writesPassed = await verifyBasicLocalWrites(db, DEV_SMOKE_USER_ID);

      if (!writesPassed) {
        throw new Error('Basic local write verification returned false');
      }

      logger.info('passed', { defaultCategoryCount: categories.length });
      setSmokeStatus('passed');
    } catch (error) {
      logger.error('failed', error);
      setSmokeStatus('failed');
    }
  }

  return (
    <Screen
      action={<SyncBadge status={syncStatus === 'running' ? 'pending' : syncSummary?.status ?? 'idle'} />}
      description="Manage your account, backup, and category setup from one place."
      eyebrow="Operations"
      title="Settings desk"
    >

      <View className="mt-8 rounded-[32px] bg-primary p-5">
        <Text className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/70">
          Signed in as
        </Text>
        <Text className="mt-3 text-2xl font-black text-primary-foreground">
          {user?.email ?? 'No active account'}
        </Text>
        <Text className="mt-2 text-sm leading-5 text-primary-foreground/75">
          {setupStatus === 'ready' ? 'Your account is ready.' : setupStatus === 'running' ? 'Preparing your account…' : setupStatus === 'failed' ? 'Account setup needs attention.' : 'Account setup is waiting.'}
        </Text>
      </View>

      <View className="mt-5 rounded-3xl border border-border bg-card p-5">
        <Text className="text-xs font-black uppercase tracking-[0.2em] text-stamp">Backup</Text>
        <Text className="mt-3 text-xl font-black text-foreground">Cloud backup</Text>
        <Text className="mt-2 text-sm leading-5 text-muted">
          Backs up your latest changes and restores anything saved from another device.
        </Text>
        <View className="mt-4 flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-background p-3">
            <Text className="text-xs font-black uppercase tracking-[0.16em] text-muted">Pending</Text>
            <Text className="mt-1 text-2xl font-black text-foreground">{syncSummary?.pending ?? 0}</Text>
          </View>
          <View className="flex-1 rounded-2xl bg-background p-3">
            <Text className="text-xs font-black uppercase tracking-[0.16em] text-muted">Failed</Text>
            <Text className="mt-1 text-2xl font-black text-foreground">{syncSummary?.failed ?? 0}</Text>
          </View>
        </View>
        {syncSummary?.rows.length ? (
          <View className="mt-4 gap-2 rounded-2xl bg-background p-3">
            {syncSummary.rows.map((row) => (
              <View key={row.entityType} className="flex-row items-center justify-between">
                <Text className="text-sm font-bold text-muted">{syncEntityLabels[row.entityType]}</Text>
                <Text className="text-sm font-black text-foreground">{row.pending} pending · {row.failed} failed</Text>
              </View>
            ))}
          </View>
        ) : null}
        <Pressable
          className={syncStatus === 'running' ? 'mt-4 rounded-2xl bg-muted px-4 py-3' : 'mt-4 rounded-2xl bg-foreground px-4 py-3'}
          disabled={syncStatus === 'running'}
          onPress={runManualSync}
        >
          <Text className="text-center text-sm font-black uppercase tracking-[0.16em] text-background">
            {syncStatus === 'running' ? 'Backing up…' : 'Back up now'}
          </Text>
        </Pressable>
        {syncError ? <FormError message={syncError} /> : null}
      </View>

      {__DEV__ ? (
        <View className="mt-5 rounded-3xl border border-dashed border-stamp bg-card p-5">
          <Text className="text-xs font-black uppercase tracking-[0.2em] text-stamp">
            Developer validation
          </Text>
          <Text className="mt-3 text-xl font-black text-foreground">Local SQLite smoke test</Text>
          <Text className="mt-2 text-sm leading-5 text-muted">
            Runs migrations, seeds default categories twice, and writes one row to every local table.
            Details print to Expo logs under [settings].
          </Text>
          <Pressable
            className="mt-4 rounded-2xl bg-foreground px-4 py-3"
            disabled={smokeStatus === 'running'}
            onPress={runLocalSmokeTest}
          >
            <Text className="text-center text-sm font-black uppercase tracking-[0.16em] text-background">
              {smokeStatus === 'running' ? 'Running…' : 'Run smoke test'}
            </Text>
          </Pressable>
          <Text className="mt-3 text-sm font-bold text-foreground">Status: {smokeStatus}</Text>
        </View>
      ) : null}

      <View className="mt-5 rounded-3xl border border-border bg-card p-5">
        <Text className="text-xs font-black uppercase tracking-[0.2em] text-stamp">Auth controls</Text>
        <Pressable
          className={
            logoutStatus === 'running'
              ? 'mt-4 rounded-2xl bg-muted px-4 py-3'
              : 'mt-4 rounded-2xl bg-danger px-4 py-3'
          }
          disabled={logoutStatus === 'running'}
          onPress={submitLogout}
        >
          <Text className="text-center text-sm font-black uppercase tracking-[0.16em] text-primary-foreground">
            {logoutStatus === 'running' ? 'Logging out…' : 'Logout'}
          </Text>
        </Pressable>
        {logoutStatus === 'failed' ? (
          <Text className="mt-3 text-sm font-bold text-danger">Logout failed. Try again.</Text>
        ) : null}
      </View>

      <View className="mt-5 overflow-hidden rounded-3xl border border-border bg-card">
        <Pressable className="px-5 py-4" onPress={() => router.push('/categories' as never)}>
          <Text className="text-base font-bold text-foreground">Manage categories</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
