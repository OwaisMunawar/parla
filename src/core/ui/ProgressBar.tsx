import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useTheme } from '@/core/theme';

export function ProgressBar({
  progress,
  color,
  height = 10,
  testID,
}: {
  progress: number;
  color?: string;
  height?: number;
  testID?: string;
}) {
  const { colors, motion } = useTheme();
  const value = Math.min(1, Math.max(0, progress));
  const width = useSharedValue(0);

  useEffect(() => {
    width.set(withSpring(value, motion.spring));
  }, [motion.spring, value, width]);

  const fill = useAnimatedStyle(() => ({ width: `${width.get() * 100}%` }));

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: colors.surfaceSunken,
        overflow: 'hidden',
      }}>
      <Animated.View
        style={[
          { height, borderRadius: height / 2, backgroundColor: color ?? colors.accent },
          fill,
        ]}
      />
    </View>
  );
}
