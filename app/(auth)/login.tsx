import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { useAuth } from '@/src/auth';
import { ErrorState, Screen } from '@/src/components/ui';

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submitLogin() {
    setErrorMessage(null);

    const parsed = loginSchema.safeParse({ email, password });

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? 'Check your login details.');
      return;
    }

    setSubmitting(true);

    try {
      await signIn(parsed.data.email, parsed.data.password);
      router.replace('/(tabs)/dashboard');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to log in.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen
      eyebrow="Secure desk"
      title="Log in"
      description="Sign in to unlock your private ledger and backup."
    >
      <View className="mt-8 rounded-[32px] border border-border bg-card p-5">
        <Text className="text-xs font-black uppercase tracking-[0.2em] text-stamp">Email</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          className="mt-3 rounded-2xl border border-border bg-background px-4 py-4 text-base font-bold text-foreground"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColorClassName="accent-muted"
          textContentType="emailAddress"
          value={email}
        />

        <Text className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-stamp">Password</Text>
        <TextInput
          className="mt-3 rounded-2xl border border-border bg-background px-4 py-4 text-base font-bold text-foreground"
          onChangeText={setPassword}
          onSubmitEditing={submitLogin}
          placeholder="••••••••"
          placeholderTextColorClassName="accent-muted"
          returnKeyType="go"
          secureTextEntry
          submitBehavior="submit"
          textContentType="password"
          value={password}
        />

        {errorMessage ? (
          <View className="mt-5">
            <ErrorState description={errorMessage} title="Login failed" />
          </View>
        ) : null}

        <Pressable
          className={
            submitting
              ? 'mt-6 rounded-2xl bg-muted px-4 py-4'
              : 'mt-6 rounded-2xl bg-primary px-4 py-4'
          }
          disabled={submitting}
          onPress={submitLogin}
        >
          <Text className="text-center text-sm font-black uppercase tracking-[0.18em] text-primary-foreground">
            {submitting ? 'Checking ledger…' : 'Log in'}
          </Text>
        </Pressable>
      </View>

      <Link href="/(auth)/register" className="mt-6 text-center text-base font-black text-primary">
        Need an account? Register
      </Link>
    </Screen>
  );
}
