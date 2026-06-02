import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Screen } from '@/src/components/ui';

export default function AttachmentPreviewScreen() {
  const { uri } = useLocalSearchParams<{ uri?: string }>();

  return (
    <Screen description="Receipt photo" eyebrow="Receipt" title="Preview">
      <Pressable className="mt-7 size-11 items-center justify-center rounded-full border border-border bg-card" onPress={() => router.back()}>
        <Text className="text-xl font-black text-foreground">←</Text>
      </Pressable>

      <View className="mt-6 flex-1 overflow-hidden rounded-[32px] border border-border bg-[#0B0A09]">
        {uri ? (
          <Image source={{ uri }} style={{ flex: 1, minHeight: 520, width: '100%' }} contentFit="contain" />
        ) : (
          <View className="min-h-[520px] items-center justify-center p-6">
            <Text className="text-center text-base font-bold text-primary-foreground">Receipt image is unavailable.</Text>
          </View>
        )}
      </View>
    </Screen>
  );
}
