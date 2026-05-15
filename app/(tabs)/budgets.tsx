import { ScrollView, Text, View } from 'react-native';

const budgetPreview = [
  ['Food', '0%', 'bg-success'],
  ['Transport', '0%', 'bg-warning'],
  ['Bills', '0%', 'bg-danger'],
];

export default function BudgetsScreen() {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pb-10 pt-16">
      <Text className="text-xs font-black uppercase tracking-[0.24em] text-stamp">Limits</Text>
      <Text className="mt-3 text-5xl font-black tracking-tight text-foreground">Budget pressure</Text>
      <Text className="mt-3 text-base leading-6 text-muted">
        Monthly category limits should show pressure early, before overspending becomes a surprise.
      </Text>

      <View className="mt-8 rounded-[32px] border border-border bg-card p-5">
        <Text className="text-xs font-black uppercase tracking-[0.22em] text-primary">May controls</Text>
        <View className="mt-5 gap-5">
          {budgetPreview.map(([name, value, color]) => (
            <View key={name}>
              <View className="flex-row justify-between">
                <Text className="text-base font-bold text-foreground">{name}</Text>
                <Text className="font-mono text-sm font-black text-muted">{value}</Text>
              </View>
              <View className="mt-2 h-3 overflow-hidden rounded-full bg-border">
                <View className={`h-3 w-1/12 rounded-full ${color}`} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
