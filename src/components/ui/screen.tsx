import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

type ScreenProps = {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function Screen({ eyebrow, title, description, action, children }: ScreenProps) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-5 pb-10 pt-16"
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-xs font-black uppercase tracking-[0.24em] text-stamp">{eyebrow}</Text>
          {action}
        </View>
        <Text
          className="mt-3 text-5xl font-black leading-[52px] tracking-tight text-foreground ios:text-4xl ios:leading-[42px]"
          maxFontSizeMultiplier={1.1}
        >
          {title}
        </Text>
        {description ? (
          <Text className="mt-3 text-base leading-6 text-muted">{description}</Text>
        ) : null}
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
