import { Pressable, Text, View } from 'react-native';

type MonthSelectorProps = {
  monthLabel: string;
  onPrevious?: () => void;
  onNext?: () => void;
};

export function MonthSelector({ monthLabel, onPrevious, onNext }: MonthSelectorProps) {
  return (
    <View className="flex-row items-center justify-between rounded-full border border-border bg-card p-1">
      <Pressable className="rounded-full bg-receipt px-4 py-3" onPress={onPrevious}>
        <Text className="font-mono text-sm font-black text-primary">‹</Text>
      </Pressable>
      <Text className="text-sm font-black uppercase tracking-[0.18em] text-foreground">{monthLabel}</Text>
      <Pressable className="rounded-full bg-receipt px-4 py-3" onPress={onNext}>
        <Text className="font-mono text-sm font-black text-primary">›</Text>
      </Pressable>
    </View>
  );
}
