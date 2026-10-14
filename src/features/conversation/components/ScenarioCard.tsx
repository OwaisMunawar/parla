import { View } from 'react-native';

import { useTheme } from '@/core/theme';
import { Icon, Pill, ScalePressable, Text, type IconName } from '@/core/ui';

import { type Scenario, type ScenarioIcon } from '../content';

const icons: Record<ScenarioIcon, IconName> = { cup: 'cup', briefcase: 'briefcase', map: 'map' };

export function ScenarioCard({
  scenario,
  locked,
  onPress,
}: {
  scenario: Scenario;
  locked: boolean;
  onPress: () => void;
}) {
  const { colors, radii, spacing } = useTheme();
  const tint = { cup: colors.flame, briefcase: colors.accent, map: colors.success }[scenario.icon];
  const soft = { cup: colors.flameSoft, briefcase: colors.accentSoft, map: colors.successSoft }[
    scenario.icon
  ];
  return (
    <ScalePressable
      testID={`scenario-${scenario.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${scenario.title}. ${scenario.subtitle}. Level ${scenario.level}`}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radii.lg,
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderBottomWidth: 4,
        borderColor: colors.border,
      }}>
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: radii.md,
          backgroundColor: soft,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name={icons[scenario.icon]} size={24} color={tint} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="headline">{scenario.title}</Text>
        <Text variant="caption" color="textMuted">
          {scenario.subtitle}
        </Text>
      </View>
      {locked ? (
        <Icon name="lock" size={16} color={colors.textFaint} />
      ) : (
        <Pill label={scenario.level} tone="accent" />
      )}
    </ScalePressable>
  );
}
