import { useRouter } from 'expo-router';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { languageInfo, LANGUAGES } from '@/core/content/languages';
import { t } from '@/core/i18n/translate';
import { useTheme } from '@/core/theme';
import { Button, ChoiceCard, Screen, Text } from '@/core/ui';

import { StreakFlame } from '../../progress/components/StreakFlame';
import { useOnboardingDraft } from '../OnboardingDraft';

export function LanguageScreen() {
  const { colors, radii, spacing } = useTheme();
  const router = useRouter();
  const { draft, update } = useOnboardingDraft();

  return (
    <Screen scroll testID="onboarding-language" edges={['top', 'bottom']}>
      <Animated.View
        entering={FadeInDown.springify()}
        style={{ alignItems: 'center', gap: spacing.md, paddingTop: spacing.xl }}>
        <StreakFlame lit size={72} />
        <Text variant="display" align="center">
          {t('onboarding.welcomeTitle')}
        </Text>
        <Text color="textMuted" align="center">
          {t('onboarding.welcomeBody')}
        </Text>
      </Animated.View>

      <Text variant="title" style={{ marginTop: spacing.lg }}>
        {t('onboarding.languageTitle')}
      </Text>
      <View style={{ gap: spacing.md }}>
        {LANGUAGES.map((language) => (
          <ChoiceCard
            key={language}
            testID={`language-${language}`}
            title={t(`languages.${language}`)}
            detail={languageInfo[language].nativeName}
            selected={draft.language === language}
            onPress={() => update({ language })}
            leading={
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radii.sm,
                  backgroundColor: colors.accentSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text variant="headline" color="accent">
                  {languageInfo[language].badge}
                </Text>
              </View>
            }
          />
        ))}
      </View>
      <Button
        testID="onboarding-continue"
        label={t('onboarding.start')}
        onPress={() => router.push('/onboarding/goal')}
      />
    </Screen>
  );
}
