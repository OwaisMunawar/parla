import { View } from 'react-native';

import { t } from '@/core/i18n/translate';
import { useTheme } from '@/core/theme';
import { Icon, Pill, ScalePressable, Text } from '@/core/ui';

import { type Plan } from '../engine/Billing';

export function PlanCard({
  plan,
  selected,
  monthlyEquivalent,
  savingPercent,
  onPress,
}: {
  plan: Plan;
  selected: boolean;
  monthlyEquivalent: string | null;
  savingPercent: number | null;
  onPress: () => void;
}) {
  const { colors, radii, spacing } = useTheme();
  const yearly = plan.period === 'yearly';
  return (
    <ScalePressable
      testID={`plan-${plan.period}`}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${yearly ? t('paywall.yearly') : t('paywall.monthly')}, ${plan.displayPrice}${plan.trialDays ? `, ${t('paywall.trialBadge', { days: plan.trialDays })}` : ''}`}
      onPress={onPress}
      pressedScale={0.98}
      style={{
        padding: spacing.lg,
        borderRadius: radii.lg,
        borderWidth: 2,
        borderBottomWidth: 4,
        borderColor: selected ? colors.accent : colors.border,
        backgroundColor: selected ? colors.accentSoft : colors.surface,
        gap: spacing.sm,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: 2,
            borderColor: selected ? colors.accent : colors.textFaint,
            backgroundColor: selected ? colors.accent : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {selected && <Icon name="check" size={12} color={colors.onAccent} />}
        </View>
        <Text variant="headline" style={{ flex: 1 }}>
          {yearly ? t('paywall.yearly') : t('paywall.monthly')}
        </Text>
        {yearly && savingPercent ? <Pill label={`-${savingPercent}%`} tone="success" /> : null}
        {yearly ? <Pill label={t('paywall.bestValue')} tone="flame" /> : null}
      </View>
      <View
        style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, paddingLeft: 30 }}>
        <Text variant="title">{plan.displayPrice}</Text>
        <Text variant="caption" color="textMuted">
          {yearly ? t('paywall.slashYear') : t('paywall.slashMonth')}
        </Text>
        {monthlyEquivalent ? (
          <Text variant="caption" color="textMuted">
            {`· ${t('paywall.perMonth', { price: monthlyEquivalent })}`}
          </Text>
        ) : null}
      </View>
      {plan.trialDays ? (
        <View style={{ paddingLeft: 30 }}>
          <Pill
            testID="trial-badge"
            label={t('paywall.trialBadge', { days: plan.trialDays })}
            tone="accent"
            icon="sparkles"
          />
        </View>
      ) : null}
    </ScalePressable>
  );
}
