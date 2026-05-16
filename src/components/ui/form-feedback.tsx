import { Text, View } from 'react-native';

type FeedbackProps = {
  message: string;
  title?: string;
};

export function FieldError({ message }: FeedbackProps) {
  return <Text className="mt-2 text-sm font-bold text-danger">{message}</Text>;
}

export function FormError({ message, title = 'Needs review' }: FeedbackProps) {
  return (
    <View className="mt-5 rounded-3xl border border-danger/40 bg-background p-4">
      <Text className="font-mono text-xs font-black uppercase tracking-[0.18em] text-danger">{title}</Text>
      <Text className="mt-2 text-sm leading-5 text-muted">{message}</Text>
    </View>
  );
}
