import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

type ScreenProps = {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function Screen({ eyebrow, title, description, action, children }: ScreenProps) {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pb-10 pt-16">
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <Text className="text-xs font-black uppercase tracking-[0.24em] text-stamp">{eyebrow}</Text>
          <Text className="mt-3 text-5xl font-black leading-[52px] tracking-tight text-foreground">
            {title}
          </Text>
          {description ? (
            <Text className="mt-3 text-base leading-6 text-muted">{description}</Text>
          ) : null}
        </View>
        {action}
      </View>
      {children}
    </ScrollView>
  );
}
