import { Link, router } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Screen } from '@/src/components/ui';

export default function RegisterScreen() {
  return (
    <Screen
      eyebrow="New ledger"
      title="Register"
      description="Phase 5 will attach Supabase auth, profile creation, and first-run category seeding here."
    >
      <View className="mt-8 rounded-[32px] border border-border bg-card p-5">
        <Text className="text-xs font-black uppercase tracking-[0.2em] text-stamp">Email</Text>
        <TextInput
          autoCapitalize="none"
          className="mt-3 rounded-2xl border border-border bg-background px-4 py-4 text-base font-bold text-foreground"
          editable={false}
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColorClassName="accent-muted"
        />

        <Text className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-stamp">Password</Text>
        <TextInput
          className="mt-3 rounded-2xl border border-border bg-background px-4 py-4 text-base font-bold text-foreground"
          editable={false}
          placeholder="Minimum 8 characters"
          placeholderTextColorClassName="accent-muted"
          secureTextEntry
        />

        <Pressable
          className="mt-6 rounded-2xl bg-primary px-4 py-4"
          onPress={() => router.replace('/(tabs)/dashboard')}
        >
          <Text className="text-center text-sm font-black uppercase tracking-[0.18em] text-primary-foreground">
            Continue to app preview
          </Text>
        </Pressable>
      </View>

      <Link href="/(auth)/login" className="mt-6 text-center text-base font-black text-primary">
        Already have an account? Log in
      </Link>
      <Link href="/(tabs)/settings" className="mt-4 text-center text-sm font-bold text-muted">
        Back to settings
      </Link>
    </Screen>
  );
}
