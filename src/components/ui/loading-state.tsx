import { ActivityIndicator, Text, View } from 'react-native';

import type { StateProps } from './state';

export function LoadingState({ title, description, label = 'Loading' }: StateProps) {
  return (
    <View className="rounded-3xl border border-border bg-card p-5">
      <View className="flex-row items-center gap-3">
        <ActivityIndicator colorClassName="accent-stamp" />
        <Text className="font-mono text-xs font-black uppercase tracking-[0.18em] text-stamp">
          {label}
        </Text>
      </View>
      <Text className="mt-5 text-2xl font-black text-foreground">{title}</Text>
      <Text className="mt-2 text-sm leading-5 text-muted">{description}</Text>
    </View>
  );
}
