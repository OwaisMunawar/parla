import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type PillTone = 'neutral' | 'accent' | 'flame' | 'success' | 'warning' | 'danger';

export function Pill({
  label,
  icon,
  tone = 'neutral',
  testID,
}: {
  label: string;
  icon?: IconName;
  tone?: PillTone;
  testID?: string;
}) {
  const { colors, radii, spacing } = useTheme();
  const palette = {
    neutral: { bg: colors.surfaceSunken, fg: colors.textMuted },
    accent: { bg: colors.accentSoft, fg: colors.accent },
    flame: { bg: colors.flameSoft, fg: colors.flame },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  }[tone];
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs + 1,
        paddingHorizontal: spacing.md - 2,
        paddingVertical: spacing.xs,
        borderRadius: radii.pill,
        backgroundColor: palette.bg,
        alignSelf: 'flex-start',
      }}>
      {icon && <Icon name={icon} size={12} color={palette.fg} />}
      <Text variant="caption" style={{ color: palette.fg, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}
