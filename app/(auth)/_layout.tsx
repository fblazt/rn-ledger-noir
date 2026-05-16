import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/src/auth';

export default function AuthLayout() {
  const { loading, session } = useAuth();

  if (loading) {
    return null;
  }

  if (session) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
