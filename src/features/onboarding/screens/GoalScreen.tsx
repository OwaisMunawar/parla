import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { t } from '@/core/i18n/translate';
import { useTheme } from '@/core/theme';
import { Button, ChoiceCard, Icon, Screen, Text, type IconName } from '@/core/ui';

import { StepHeader } from '../components/StepHeader';
import { GOALS, type LearningGoal } from '../data/profileRepository';
import { useOnboardingDraft } from '../OnboardingDraft';

const icons: Record<LearningGoal, IconName> = {
  travel: 'map',
  work: 'briefcase',
  conversation: 'chat',
  culture: 'book',
};

export function GoalScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { draft, update } = useOnboardingDraft();
  return (
    <Screen scroll testID="onboarding-goal" edges={['top', 'bottom']}>
      <StepHeader step={1} />
      <Text variant="title">{t('onboarding.goalTitle')}</Text>
      <View style={{ gap: spacing.md }}>
        {GOALS.map((goal) => (
          <ChoiceCard
            key={goal}
            testID={`goal-${goal}`}
            title={t(`goals.${goal}`)}
            selected={draft.goal === goal}
            onPress={() => update({ goal })}
            leading={<Icon name={icons[goal]} size={22} color={colors.accent} />}
          />
        ))}
      </View>
      <Button
        testID="onboarding-continue"
        label={t('common.continue')}
        onPress={() => router.push('/onboarding/placement')}
      />
    </Screen>
  );
}
