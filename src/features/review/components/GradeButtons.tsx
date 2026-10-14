import { View } from 'react-native';

import { t } from '@/core/i18n/translate';
import { useTheme } from '@/core/theme';
import { ScalePressable, Text } from '@/core/ui';

import { formatInterval, GRADES, type CardSchedule, type Grade } from '../lib/scheduler';

/** Again / Hard / Good / Easy, each labelled with the interval it would schedule. */
export function GradeButtons({
  preview,
  now,
  onGrade,
}: {
  preview: Record<Grade, CardSchedule>;
  now: number;
  onGrade: (grade: Grade) => void;
}) {
  const { colors, radii, spacing } = useTheme();
  const tone: Record<Grade, { fg: string; bg: string }> = {
    again: { fg: colors.danger, bg: colors.dangerSoft },
    hard: { fg: colors.warning, bg: colors.warningSoft },
    good: { fg: colors.success, bg: colors.successSoft },
    easy: { fg: colors.accent, bg: colors.accentSoft },
  };
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      {GRADES.map((grade) => {
        const interval = formatInterval(preview[grade].due - now);
        return (
          <ScalePressable
            key={grade}
            testID={`grade-${grade}`}
            accessibilityRole="button"
            accessibilityLabel={`${t(`review.${grade}`)}, next in ${interval}`}
            onPress={() => onGrade(grade)}
            style={{
              flex: 1,
              alignItems: 'center',
              gap: 2,
              paddingVertical: spacing.md,
              borderRadius: radii.md,
              backgroundColor: tone[grade].bg,
              borderBottomWidth: 3,
              borderColor: tone[grade].fg,
            }}>
            <Text variant="callout" style={{ color: tone[grade].fg, fontWeight: '800' }}>
              {t(`review.${grade}`)}
            </Text>
            <Text variant="caption" style={{ color: tone[grade].fg }}>
              {interval}
            </Text>
          </ScalePressable>
        );
      })}
    </View>
  );
}
