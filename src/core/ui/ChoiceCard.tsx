import { type ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/core/theme';

import { ScalePressable } from './Pressable';
import { Text } from './Text';

/** A selectable option: languages, goals, placement answers, plans. */
export function ChoiceCard({
  title,
  detail,
  leading,
  trailing,
  selected,
  tone = 'accent',
  onPress,
  testID,
}: {
  title: string;
  detail?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  selected: boolean;
  tone?: 'accent' | 'success' | 'danger';
  onPress: () => void;
  testID?: string;
}) {
  const { colors, radii, spacing } = useTheme();
  const ring = { accent: colors.accent, success: colors.success, danger: colors.danger }[tone];
  const fill = {
    accent: colors.accentSoft,
    success: colors.successSoft,
    danger: colors.dangerSoft,
  }[tone];
  return (
    <ScalePressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={detail ? `${title}, ${detail}` : title}
      onPress={onPress}
      pressedScale={0.98}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radii.lg,
        borderWidth: 2,
        borderBottomWidth: 4,
        borderColor: selected ? ring : colors.border,
        backgroundColor: selected ? fill : colors.surface,
      }}>
      {leading}
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text variant="headline">{title}</Text>
        {detail ? (
          <Text variant="caption" color="textMuted">
            {detail}
          </Text>
        ) : null}
      </View>
      {trailing}
    </ScalePressable>
  );
}
