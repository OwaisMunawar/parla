import { type ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme';

/** Bottom sheet for short explanations: a correction's "why", a plan detail. */
export function Sheet({
  visible,
  onClose,
  children,
  testID,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  testID?: string;
}) {
  const { colors, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          style={{ position: 'absolute', inset: 0, backgroundColor: colors.scrim }}
        />
        <Animated.View
          testID={testID}
          entering={SlideInDown.springify().damping(20)}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            padding: spacing.xl,
            paddingBottom: insets.bottom + spacing.xl,
            gap: spacing.lg,
          }}>
          <View
            style={{
              alignSelf: 'center',
              width: 40,
              height: 5,
              borderRadius: 3,
              backgroundColor: colors.surfaceSunken,
              marginTop: -spacing.sm,
            }}
          />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}
