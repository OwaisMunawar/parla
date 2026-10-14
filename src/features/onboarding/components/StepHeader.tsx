import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { t } from '@/core/i18n/translate';
import { useTheme } from '@/core/theme';
import { IconButton, ProgressBar } from '@/core/ui';

/** Back button and overall onboarding progress, shared by every step. */
export function StepHeader({ step, total = 4 }: { step: number; total?: number }) {
  const { spacing } = useTheme();
  const router = useRouter();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <IconButton icon="chevronLeft" label={t('common.back')} onPress={() => router.back()} />
      <View style={{ flex: 1 }}>
        <ProgressBar progress={step / total} />
      </View>
    </View>
  );
}
