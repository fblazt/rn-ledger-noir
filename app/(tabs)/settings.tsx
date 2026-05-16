import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { initializeDatabase, listDefaultCategories, seedDefaultCategories } from '@/src/db';
import { ErrorState, LoadingState, Screen, SyncBadge } from '@/src/components/ui';
import { verifyBasicLocalWrites } from '@/src/db/smoke';
import { createLogger } from '@/src/lib/logger';

const logger = createLogger('sqlite-smoke');
const settingsRows = ['Manual sync', 'Manage categories', 'Clear local cache', 'Logout'];
const DEV_SMOKE_USER_ID = '00000000-0000-4000-8000-000000000003';

export default function SettingsScreen() {
  const [smokeStatus, setSmokeStatus] = useState<'idle' | 'running' | 'passed' | 'failed'>('idle');

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
      action={<SyncBadge status="idle" />}
      description="Account, sync, and data safety controls should feel deliberate and audit-friendly."
      eyebrow="Operations"
      title="Settings desk"
    >

      <View className="mt-8 rounded-[32px] bg-primary p-5">
        <Text className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/70">
          Sync state
        </Text>
        <Text className="mt-3 text-2xl font-black text-primary-foreground">Local ledger ready</Text>
        <Text className="mt-2 text-sm leading-5 text-primary-foreground/75">
          Supabase connection and authenticated sync controls will attach here.
        </Text>
      </View>

      {__DEV__ ? (
        <View className="mt-5 gap-4">
          <LoadingState
            description="Confirms loading states use the same receipt-desk language as the rest of the shell."
            title="Balancing local ledger"
          />
          <ErrorState
            description="Confirms errors feel deliberate before real sync failures are wired in."
            title="Sync review needed"
          />
          <View className="rounded-3xl border border-dashed border-stamp bg-card p-5">
          <Text className="text-xs font-black uppercase tracking-[0.2em] text-stamp">
            Developer validation
          </Text>
          <Text className="mt-3 text-xl font-black text-foreground">Local SQLite smoke test</Text>
          <Text className="mt-2 text-sm leading-5 text-muted">
            Runs migrations, seeds default categories twice, and writes one row to every local table.
            Details print to Expo logs under [sqlite-smoke].
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
        </View>
      ) : null}

      <View className="mt-5 rounded-3xl border border-border bg-card p-5">
        <Text className="text-xs font-black uppercase tracking-[0.2em] text-stamp">Auth routes</Text>
        <View className="mt-4 flex-row gap-3">
          <Link href="/(auth)/login" className="flex-1 rounded-2xl bg-receipt px-4 py-3 text-center text-sm font-black text-primary">
            Login
          </Link>
          <Link href="/(auth)/register" className="flex-1 rounded-2xl bg-receipt px-4 py-3 text-center text-sm font-black text-primary">
            Register
          </Link>
        </View>
      </View>

      <View className="mt-5 overflow-hidden rounded-3xl border border-border bg-card">
        {settingsRows.map((row) => (
          <View key={row} className="border-b border-border px-5 py-4">
            <Text className="text-base font-bold text-foreground">{row}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}
