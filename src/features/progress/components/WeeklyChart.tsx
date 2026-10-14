import { Canvas, Line, RoundedRect, vec } from '@shopify/react-native-skia';
import { useState } from 'react';
import { View } from 'react-native';

import { isoWeekday } from '@/core/lib/localDate';
import { useTheme } from '@/core/theme';
import { Text } from '@/core/ui';

import { type DailyXp } from '../lib/xp';

const LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Seven XP bars with the daily goal as a dashed line. Today is the solid one. */
export function WeeklyChart({
  week,
  goal,
  height = 120,
}: {
  week: readonly DailyXp[];
  goal: number;
  height?: number;
}) {
  const { colors, spacing } = useTheme();
  const [width, setWidth] = useState(0);
  const max = Math.max(goal * 1.25, ...week.map((d) => d.xp), 1);
  const slot = width / Math.max(1, week.length);
  const bar = Math.min(28, slot * 0.56);
  const goalY = height - (goal / max) * height;

  return (
    <View
      accessible
      accessibilityLabel={week.map((d) => `${d.day}: ${d.xp} XP`).join(', ')}
      style={{ gap: spacing.sm }}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
        {width > 0 && (
          <Canvas style={{ width, height }}>
            {week.map((day, index) => {
              const h = Math.max(4, (day.xp / max) * height);
              const today = index === week.length - 1;
              const color =
                day.xp >= goal ? colors.flame : today ? colors.accent : colors.accentSoft;
              return (
                <RoundedRect
                  key={day.day}
                  x={slot * index + (slot - bar) / 2}
                  y={height - h}
                  width={bar}
                  height={h}
                  r={8}
                  color={color}
                />
              );
            })}
            <Line
              p1={vec(0, goalY)}
              p2={vec(width, goalY)}
              color={colors.textFaint}
              strokeWidth={1}
              opacity={0.6}
            />
          </Canvas>
        )}
      </View>
      <View style={{ flexDirection: 'row' }}>
        {week.map((day) => (
          <Text
            key={day.day}
            variant="caption"
            color="textFaint"
            align="center"
            style={{ flex: 1 }}>
            {LABELS[isoWeekday(day.day)]}
          </Text>
        ))}
      </View>
    </View>
  );
}
