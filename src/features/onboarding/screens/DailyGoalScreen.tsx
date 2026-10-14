import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useServices } from '@/composition/ServicesProvider';
import { t } from '@/core/i18n/translate';
import { useTheme } from '@/core/theme';
import { Button, ChoiceCard, Icon, ScalePressable, Screen, Text } from '@/core/ui';

import { XP } from '../../progress/lib/xp';
import { StepHeader } from '../components/StepHeader';
import { DAILY_GOALS } from '../data/profileRepository';
import { useOnboardingDraft } from '../OnboardingDraft';

const REMINDER_TIMES = ['08:00', '12:30', '19:30', '21:00'] as const;

export function DailyGoalScreen() {
  const { colors, radii, spacing } = useTheme();
  const router = useRouter();
  const services = useServices();
  const { draft, update } = useOnboardingDraft();
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
    const now = services.clock.now().getTime();
    let reminderTime = draft.reminderTime;
    if (reminderTime && !(await services.reminders.requestPermission().catch(() => false)))
      reminderTime = null;
    await services.profiles.save(
      {
        language: draft.language,
        goal: draft.goal,
        level: draft.level,
        levelPoints: 0,
        dailyGoalXp: draft.dailyGoalXp,
        reminderTime,
        onboardedAt: now,
      },
      now,
    );
    await services.progress.record({
      kind: 'placement',
      xp: XP.placement,
      language: draft.language,
    });
    services.changes.emit('profile');
    services.changes.emit('progress');
    // The soft paywall opens as a sheet over home, so "maybe later" lands
    // the learner exactly where they would be without it.
    router.replace('/(tabs)');
    router.push({ pathname: '/paywall', params: { source: 'onboarding' } });
  };

  return (
    <Screen scroll testID="onboarding-daily-goal" edges={['top', 'bottom']}>
      <StepHeader step={3} />
      <Text variant="title">{t('onboarding.dailyGoalTitle')}</Text>
      <View style={{ gap: spacing.md }}>
        {DAILY_GOALS.map((xp) => (
          <ChoiceCard
            key={xp}
            testID={`daily-goal-${xp}`}
            title={t(`onboarding.dailyGoal_${xp}`)}
            detail={t('onboarding.dailyGoalCaption', { xp, minutes: Math.round(xp / 4) })}
            selected={draft.dailyGoalXp === xp}
            onPress={() => update({ dailyGoalXp: xp })}
            leading={<Icon name="flame" size={22} color={colors.flame} />}
          />
        ))}
      </View>

      <Text variant="title">{t('onboarding.reminderTitle')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {[...REMINDER_TIMES, null].map((time) => {
          const selected = draft.reminderTime === time;
          return (
            <ScalePressable
              key={time ?? 'off'}
              testID={`reminder-${time ?? 'off'}`}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => update({ reminderTime: time })}
              style={{
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                borderRadius: radii.pill,
                borderWidth: 2,
                borderColor: selected ? colors.accent : colors.border,
                backgroundColor: selected ? colors.accentSoft : colors.surface,
              }}>
              <Text
                variant="callout"
                style={{ fontWeight: '700', color: selected ? colors.accent : colors.text }}>
                {time ?? t('onboarding.reminderOff')}
              </Text>
            </ScalePressable>
          );
        })}
      </View>
      {draft.reminderTime ? (
        <Text variant="caption" color="textMuted">
          {t('onboarding.reminderOn', { time: draft.reminderTime })}
        </Text>
      ) : null}
      <Button
        testID="onboarding-finish"
        label={t('common.continue')}
        loading={saving}
        onPress={() => void finish()}
      />
    </Screen>
  );
}
