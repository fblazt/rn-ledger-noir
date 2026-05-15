import { ScrollView, Text, View } from 'react-native';

const settingsRows = ['Manual sync', 'Manage categories', 'Clear local cache', 'Logout'];

export default function SettingsScreen() {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pb-10 pt-16">
      <Text className="text-xs font-black uppercase tracking-[0.24em] text-stamp">Operations</Text>
      <Text className="mt-3 text-5xl font-black tracking-tight text-foreground">Settings desk</Text>
      <Text className="mt-3 text-base leading-6 text-muted">
        Account, sync, and data safety controls should feel deliberate and audit-friendly.
      </Text>

      <View className="mt-8 rounded-[32px] bg-primary p-5">
        <Text className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/70">
          Sync state
        </Text>
        <Text className="mt-3 text-2xl font-black text-primary-foreground">Local ledger ready</Text>
        <Text className="mt-2 text-sm leading-5 text-primary-foreground/75">
          Supabase connection and authenticated sync controls will attach here.
        </Text>
      </View>

      <View className="mt-5 overflow-hidden rounded-3xl border border-border bg-card">
        {settingsRows.map((row) => (
          <View key={row} className="border-b border-border px-5 py-4">
            <Text className="text-base font-bold text-foreground">{row}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
