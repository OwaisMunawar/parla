import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/core/theme';

import { Icon } from './Icon';
import { Text } from './Text';

/**
 * The hold-to-talk control. Press-and-hold maps to the recogniser's session:
 * press in starts listening, release stops and sends. A pulsing halo while
 * listening and a firm haptic at both ends make the state obvious without
 * looking, which matters when you are concentrating on a sentence.
 */
export function HoldToTalk({
  listening,
  disabled,
  label,
  onPressIn,
  onPressOut,
  size = 88,
  testID = 'hold-to-talk',
}: {
  listening: boolean;
  disabled?: boolean;
  label: string;
  onPressIn: () => void;
  onPressOut: () => void;
  size?: number;
  testID?: string;
}) {
  const { colors, motion, spacing } = useTheme();
  const scale = useSharedValue(1);
  const halo = useSharedValue(0);

  useEffect(() => {
    if (listening) {
      halo.set(withRepeat(withTiming(1, { duration: 1100 }), -1, false));
    } else {
      cancelAnimation(halo);
      halo.set(withTiming(0, { duration: motion.fast }));
    }
  }, [halo, listening, motion.fast]);

  const button = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const ring = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - halo.get()),
    transform: [{ scale: 1 + halo.get() * 0.55 }],
  }));

  return (
    <View style={{ alignItems: 'center', gap: spacing.sm }}>
      <View
        style={{
          width: size * 1.6,
          height: size * 1.6,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.flame,
            },
            ring,
          ]}
        />
        <Pressable
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled: !!disabled, busy: listening }}
          disabled={disabled}
          onPressIn={() => {
            scale.set(withSpring(0.92, motion.spring));
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
            onPressIn();
          }}
          onPressOut={() => {
            scale.set(withSpring(1, motion.bouncy));
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
            onPressOut();
          }}>
          <Animated.View
            style={[
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: listening ? colors.flame : colors.accent,
                borderBottomWidth: 5,
                borderColor: listening ? '#D9581A' : '#4F33D9',
                opacity: disabled ? 0.45 : 1,
              },
              button,
            ]}>
            <Icon name="mic" size={size * 0.38} color="#FFFFFF" />
          </Animated.View>
        </Pressable>
      </View>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
    </View>
  );
}
