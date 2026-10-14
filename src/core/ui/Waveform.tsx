import { useEffect, useReducer, useState } from 'react';
import { View } from 'react-native';

import { type Store } from '@/core/lib/store';
import { useTheme } from '@/core/theme';

const BARS = 28;
const IDLE: number[] = new Array<number>(BARS).fill(0);

/**
 * Live input level as a scrolling bar strip. It subscribes to the volume
 * store directly, so the ~12 level updates a second re-render this strip and
 * nothing above it. With file input there are no level events, and an idle
 * shimmer says "listening" instead of a flat line that reads as broken.
 */
export function Waveform({
  volume,
  active,
  color,
  height = 44,
}: {
  volume: Store<number>;
  active: boolean;
  color?: string;
  height?: number;
}) {
  const { colors } = useTheme();
  const [history, push] = useReducer(
    (bars: number[], level: number) => [...bars.slice(1), level],
    IDLE,
  );
  const [tick, setTick] = useState(0);

  useEffect(() => volume.subscribe(() => push(volume.get())), [volume]);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setTick((t) => t + 1), 90);
    return () => clearInterval(timer);
  }, [active]);

  const bars = active ? history : IDLE;
  const silent = active && bars.every((b) => b < 0.02);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        height,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
      }}>
      {bars.map((value, index) => {
        const shimmer = silent ? 0.18 + 0.14 * Math.abs(Math.sin((index + tick) * 0.45)) : 0;
        const h = Math.max(4, (active ? Math.max(value, shimmer) : 0.06) * height);
        return (
          <View
            key={index}
            style={{
              width: 4,
              height: h,
              borderRadius: 2,
              backgroundColor: color ?? colors.accent,
              opacity: active ? 0.35 + 0.65 * (index / BARS) : 0.25,
            }}
          />
        );
      })}
    </View>
  );
}
