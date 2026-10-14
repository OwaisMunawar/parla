import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useServices } from '@/composition/ServicesProvider';
import { languageInfo, type Language } from '@/core/content/languages';
import { t } from '@/core/i18n/translate';
import { useTheme } from '@/core/theme';
import {
  Button,
  Card,
  Celebration,
  HoldToTalk,
  IconButton,
  ProgressRing,
  Screen,
  Text,
  Waveform,
} from '@/core/ui';
import { RecognizerBadge } from '@/core/ui/RecognizerBadge';
import { speechErrorText } from '@/core/speech/speechErrorText';

import { XP } from '../../progress/lib/xp';
import { drillsFor, type DrillSentence } from '../content/drills';
import { ScoredSentence } from '../components/ScoredSentence';
import { useSpeakingAttempt } from '../hooks/useSpeakingAttempt';

export function DrillScreen({ drill, language }: { drill: DrillSentence; language: Language }) {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const services = useServices();
  const locale = languageInfo[language].locale;
  const { attempt, state } = useSpeakingAttempt(locale);
  const [celebrate, setCelebrate] = useState(false);

  const all = drillsFor(language);
  const next = all[(all.findIndex((d) => d.id === drill.id) + 1) % all.length];

  const start = async () => {
    const result = await attempt.start(drill.text, locale);
    if (!result) return;
    const outcome = await services.progress.record({
      kind: 'drill',
      xp: XP.drill(result.overall),
      language,
      refId: drill.id,
    });
    services.changes.emit('progress');
    if (result.verdict === 'great' || outcome.goalJustReached) setCelebrate(true);
  };

  const result = state.result;
  const ringColor = !result
    ? colors.accent
    : result.overall >= 85
      ? colors.success
      : result.overall >= 60
        ? colors.warning
        : colors.danger;

  return (
    <Screen scroll testID="drill-screen" contentStyle={{ flexGrow: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <IconButton icon="close" label={t('common.close')} onPress={() => router.back()} />
        <Text variant="headline" style={{ flex: 1 }}>
          {t('drill.title')}
        </Text>
        <RecognizerBadge kind={state.recognizer} />
      </View>

      <Card style={{ gap: spacing.md }}>
        {result ? (
          <ScoredSentence result={result} />
        ) : (
          <Text variant="target" testID="drill-target">
            {drill.text}
          </Text>
        )}
        <Text color="textMuted">{drill.translation}</Text>
        <Button
          compact
          variant="secondary"
          icon="speaker"
          label={t('common.listen')}
          onPress={() => services.speaker.speak(drill.text, locale, { rate: 0.85 })}
        />
      </Card>

      {result ? (
        <Card
          testID="drill-result"
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
          <ProgressRing
            progress={result.overall / 100}
            size={84}
            stroke={10}
            color={ringColor}
            accessibilityLabel={`${t('drill.score')} ${result.overall}`}>
            <Text variant="title">{result.overall}</Text>
          </ProgressRing>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text variant="headline">{t(`drill.${result.verdict}`)}</Text>
            {state.heard ? (
              <Text variant="caption" color="textMuted">
                {t('drill.heard', { text: state.heard })}
              </Text>
            ) : null}
          </View>
        </Card>
      ) : (
        <Card
          style={{
            gap: spacing.xs,
            backgroundColor: colors.accentSoft,
            borderColor: 'transparent',
          }}>
          <Text variant="overline" color="accent">
            {t('drill.focus')}
          </Text>
          <Text>{drill.focus}</Text>
        </Card>
      )}

      <View style={{ flex: 1 }} />
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        {state.interim || state.error ? (
          <Text
            variant="callout"
            align="center"
            color={state.error ? 'danger' : 'text'}
            testID="drill-status">
            {state.interim || speechErrorText(state.error)}
          </Text>
        ) : null}
        <Waveform
          volume={attempt.volume}
          active={state.phase === 'listening'}
          color={colors.flame}
        />
        <HoldToTalk
          testID="drill-talk"
          listening={state.phase === 'listening'}
          label={
            state.phase === 'listening' ? t('conversation.listening') : t('onboarding.holdToSpeak')
          }
          onPressIn={() => void start()}
          onPressOut={() => attempt.stop()}
        />
        {result && next && (
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Button
              compact
              variant="secondary"
              icon="replay"
              label={t('common.retry')}
              onPress={() => attempt.reset()}
            />
            <Button
              compact
              label={t('drill.next')}
              icon="chevronRight"
              onPress={() =>
                router.replace({ pathname: '/drill/[drillId]', params: { drillId: next.id } })
              }
            />
          </View>
        )}
      </View>
      <Celebration play={celebrate} onDone={() => setCelebrate(false)} />
    </Screen>
  );
}
