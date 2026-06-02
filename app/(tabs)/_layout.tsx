import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Redirect } from 'expo-router';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';
import React from 'react';

import { useAuth } from '@/src/auth';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { loading, session } = useAuth();

  if (loading) {
    return null;
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  const activeColor = Colors[colorScheme ?? 'light'].tint;

  return (
    <NativeTabs tintColor={activeColor}>
      <NativeTabs.Trigger name="index" hidden />
      <NativeTabs.Trigger name="dashboard">
        <Icon src={<VectorIcon family={MaterialIcons} name="pie-chart" />} />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="transactions">
        <Icon src={<VectorIcon family={MaterialIcons} name="receipt-long" />} />
        <Label>Transactions</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="budgets">
        <Icon src={<VectorIcon family={MaterialIcons} name="account-balance-wallet" />} />
        <Label>Budgets</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon src={<VectorIcon family={MaterialIcons} name="settings" />} />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
