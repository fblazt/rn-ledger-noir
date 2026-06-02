import { Text, View } from 'react-native';

import type { StateProps } from './state';

export function EmptyState({ title, description, label = 'Empty' }: StateProps) {
  return (
    <View className="rounded-3xl border border-dashed border-border bg-receipt p-5">
      <Text className="font-mono text-xs font-black uppercase tracking-[0.18em] text-stamp">
        {label}
      </Text>
      <Text className="mt-5 text-2xl font-black text-foreground">{title}</Text>
      <Text className="mt-2 text-sm leading-5 text-muted">{description}</Text>
    </View>
  );
}
