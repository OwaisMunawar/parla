import { Stack } from 'expo-router';

import { useTheme } from '@/core/theme';
import { OnboardingDraftProvider } from '@/features/onboarding/OnboardingDraft';

export default function OnboardingLayout() {
  const { colors } = useTheme();
  return (
    <OnboardingDraftProvider>
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      />
    </OnboardingDraftProvider>
  );
}
