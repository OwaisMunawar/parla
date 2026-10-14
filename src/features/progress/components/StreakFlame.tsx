import { Canvas, Group, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/core/theme';

/** Flame outline in a 100 x 120 box, drawn once and scaled. */
const OUTER =
  'M50 4 C58 26 82 40 84 70 C86 98 68 116 50 116 C32 116 14 100 16 74 C17 58 26 48 32 38 C34 50 40 56 46 58 C42 40 44 22 50 4 Z';
const INNER =
  'M50 54 C56 66 68 74 68 90 C68 104 60 112 50 112 C40 112 32 104 32 92 C32 82 38 76 42 70 C44 78 48 80 50 82 C48 72 48 62 50 54 Z';

/**
 * The streak flame. Lit and flickering once today's practice is done, a
 * cold outline while the streak is waiting for today. The flicker is a
 * scale on the UI thread; the shapes never re-render.
 */
export function StreakFlame({ lit, size = 64 }: { lit: boolean; size?: number }) {
  const { colors } = useTheme();
  const flicker = useSharedValue(0);

  useEffect(() => {
    if (lit) {
      flicker.set(
        withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true),
      );
    } else {
      cancelAnimation(flicker);
      flicker.set(0);
    }
  }, [flicker, lit]);

  const outer = useMemo(() => Skia.Path.MakeFromSVGString(OUTER)!, []);
  const inner = useMemo(() => Skia.Path.MakeFromSVGString(INNER)!, []);
  const scale = size / 120;

  const transform = useDerivedValue(() => [
    { translateX: 50 },
    { translateY: 116 },
    { scaleY: 1 + flicker.get() * 0.06 },
    { scaleX: 1 - flicker.get() * 0.03 },
    { translateX: -50 },
    { translateY: -116 },
  ]);

  return (
    <Canvas style={{ width: (size * 100) / 120, height: size }} accessibilityElementsHidden>
      <Group transform={[{ scale }]}>
        <Group transform={transform}>
          <Path path={outer}>
            <LinearGradient
              start={vec(50, 0)}
              end={vec(50, 120)}
              colors={
                lit
                  ? ['#FFB547', colors.flame, '#E8431C']
                  : [colors.surfaceSunken, colors.textFaint]
              }
            />
          </Path>
          <Path path={inner} color={lit ? '#FFE07A' : colors.surface} opacity={lit ? 0.95 : 0.6} />
        </Group>
      </Group>
    </Canvas>
  );
}
