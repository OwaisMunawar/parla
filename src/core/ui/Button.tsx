import * as Haptics from 'expo-haptics';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/theme';

import { Icon, type IconName } from './Icon';
import { ScalePressable } from './Pressable';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'flame';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  testID?: string;
  accessibilityHint?: string;
};

/**
 * The primary button carries a darker "lip" under its face, the chunky,
 * pressable look of a game button, which reads as tappable at a glance.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  compact = false,
  testID,
  accessibilityHint,
}: ButtonProps) {
  const { colors, radii, spacing, scheme } = useTheme();
  const palette = {
    primary: {
      bg: colors.accent,
      fg: colors.onAccent,
      lip: scheme === 'dark' ? '#6E5BD6' : '#4F33D9',
    },
    flame: { bg: colors.flame, fg: '#FFFFFF', lip: '#D9581A' },
    secondary: { bg: colors.surface, fg: colors.text, lip: colors.border },
    ghost: { bg: 'transparent', fg: colors.accent, lip: 'transparent' },
  }[variant];
  const inactive = disabled || loading;
  const height = compact ? 40 : 54;

  return (
    <ScalePressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={() => {
        void Haptics.selectionAsync().catch(() => undefined);
        onPress();
      }}
      style={{ opacity: disabled ? 0.45 : 1 }}>
      <View
        style={{
          borderRadius: radii.md,
          backgroundColor: palette.lip,
          paddingBottom: variant === 'ghost' ? 0 : 4,
        }}>
        <View
          style={[
            styles.face,
            {
              minHeight: height,
              borderRadius: radii.md,
              backgroundColor: palette.bg,
              paddingHorizontal: compact ? spacing.lg : spacing.xl,
              gap: spacing.sm,
              borderWidth: variant === 'secondary' ? 1.5 : 0,
              borderColor: colors.border,
            },
          ]}>
          {loading ? (
            <ActivityIndicator color={palette.fg} />
          ) : (
            icon && <Icon name={icon} size={compact ? 15 : 18} color={palette.fg} />
          )}
          <Text
            variant={compact ? 'caption' : 'headline'}
            style={{ color: palette.fg, fontWeight: '800' }}>
            {label}
          </Text>
        </View>
      </View>
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  face: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
