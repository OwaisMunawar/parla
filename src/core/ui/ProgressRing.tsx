import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo, type ReactNode } from 'react';
import { View } from 'react-native';
import { useDerivedValue, useSharedValue, withSpring } from 'react-native-reanimated';

import { useTheme } from '@/core/theme';

/**
 * A Skia ring whose sweep springs to `progress`. The arc length is animated
 * on the UI thread through Path `end`, so the ring never re-renders React to
 * animate, and the label sits in the middle as ordinary views.
 */
export function ProgressRing({
  progress,
  size = 72,
  stroke = 8,
  color,
  track,
  children,
  testID,
  accessibilityLabel,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const { colors, motion } = useTheme();
  const target = Math.min(1, Math.max(0, progress));
  const sweep = useSharedValue(0);

  useEffect(() => {
    sweep.set(withSpring(target, motion.spring));
  }, [motion.spring, sweep, target]);

  const circle = useMemo(() => {
    const r = (size - stroke) / 2;
    // Start at 12 o'clock: addArc measures from 3 o'clock, clockwise.
    return Skia.PathBuilder.Make()
      .addArc({ x: stroke / 2, y: stroke / 2, width: r * 2, height: r * 2 }, -90, 359.9)
      .detach();
  }, [size, stroke]);

  const end = useDerivedValue(() => Math.max(0.001, sweep.get()));

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(target * 100) }}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Canvas style={{ position: 'absolute', width: size, height: size }}>
        <Path
          path={circle}
          style="stroke"
          strokeWidth={stroke}
          color={track ?? colors.surfaceSunken}
        />
        <Path
          path={circle}
          style="stroke"
          strokeWidth={stroke}
          strokeCap="round"
          color={color ?? colors.accent}
          start={0}
          end={end}
        />
      </Canvas>
      {children}
    </View>
  );
}
