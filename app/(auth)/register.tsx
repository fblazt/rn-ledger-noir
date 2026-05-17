import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { useAuth } from '@/src/auth';
import { ErrorState, Screen } from '@/src/components/ui';

const registerSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
});

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submitRegister() {
    setErrorMessage(null);

    const parsed = registerSchema.safeParse({ email, password });

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? 'Check your registration details.');
      return;
    }

    setSubmitting(true);

    try {
      await signUp(parsed.data.email, parsed.data.password);
      router.replace('/(tabs)/dashboard');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to register.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen
      eyebrow="New ledger"
      title="Register"
      description="Create your account and start with a ready-made category set."
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
          onSubmitEditing={submitRegister}
          placeholder="Minimum 8 characters"
          placeholderTextColorClassName="accent-muted"
          returnKeyType="go"
          secureTextEntry
          submitBehavior="submit"
          textContentType="newPassword"
          value={password}
        />

        {errorMessage ? (
          <View className="mt-5">
            <ErrorState description={errorMessage} title="Registration failed" />
          </View>
        ) : null}

        <Pressable
          className={
            submitting
              ? 'mt-6 rounded-2xl bg-muted px-4 py-4'
              : 'mt-6 rounded-2xl bg-primary px-4 py-4'
          }
          disabled={submitting}
          onPress={submitRegister}
        >
          <Text className="text-center text-sm font-black uppercase tracking-[0.18em] text-primary-foreground">
            {submitting ? 'Stamping account…' : 'Register'}
          </Text>
        </Pressable>
      </View>

      <Link href="/(auth)/login" className="mt-6 text-center text-base font-black text-primary">
        Already have an account? Log in
      </Link>
    </Screen>
  );
}
