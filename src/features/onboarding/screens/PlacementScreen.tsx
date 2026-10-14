import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { useServices } from '@/composition/ServicesProvider';
import { languageInfo } from '@/core/content/languages';
import { t } from '@/core/i18n/translate';
import { useTheme } from '@/core/theme';
import {
  Button,
  Card,
  ChoiceCard,
  HoldToTalk,
  Icon,
  Pill,
  Screen,
  Text,
  Waveform,
} from '@/core/ui';
import { RecognizerBadge } from '@/core/ui/RecognizerBadge';

import { ScoredSentence } from '../../pronunciation/components/ScoredSentence';
import { useSpeakingAttempt } from '../../pronunciation/hooks/useSpeakingAttempt';
import { StepHeader } from '../components/StepHeader';
import { placementQuestions } from '../content/placementQuestions';
import {
  scorePlacement,
  type PlacementAnswer,
  type PlacementQuestion,
  type PlacementResult,
} from '../lib/placement';
import { useOnboardingDraft } from '../OnboardingDraft';

export function PlacementScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { draft, update } = useOnboardingDraft();
  const questions = placementQuestions[draft.language];
  const [answers, setAnswers] = useState<PlacementAnswer[]>([]);
  const [result, setResult] = useState<PlacementResult | null>(null);
  const question = questions[answers.length];

  const answer = (next: PlacementAnswer) => {
    const all = [...answers, next];
    setAnswers(all);
    if (all.length === questions.length) {
      const scored = scorePlacement(questions, all);
      setResult(scored);
      update({ level: scored.level });
    }
  };

  return (
    <Screen
      scroll
      testID="onboarding-placement"
      edges={['top', 'bottom']}
      contentStyle={{ flexGrow: 1 }}>
      <StepHeader step={2} />
      <Text variant="title">{t('onboarding.placementTitle')}</Text>
      {result ? (
        <PlacementResultView
          result={result}
          onContinue={() => router.push('/onboarding/daily-goal')}
        />
      ) : question ? (
        <>
          <Text variant="caption" color="textMuted">
            {t('onboarding.placementProgress', {
              current: answers.length + 1,
              total: questions.length,
            })}
          </Text>
          <Animated.View
            key={question.id}
            entering={FadeInRight.springify().damping(18)}
            style={{ gap: spacing.lg, flex: 1 }}>
            {question.kind === 'listening' ? (
              <ListeningQuestion question={question} onAnswer={answer} />
            ) : (
              <SpeakingQuestion question={question} onAnswer={answer} />
            )}
          </Animated.View>
        </>
      ) : null}
    </Screen>
  );
}

function ListeningQuestion({
  question,
  onAnswer,
}: {
  question: Extract<PlacementQuestion, { kind: 'listening' }>;
  onAnswer: (answer: PlacementAnswer) => void;
}) {
  const { colors, spacing } = useTheme();
  const { speaker } = useServices();
  const { draft } = useOnboardingDraft();
  const [chosen, setChosen] = useState<number | null>(null);
  const play = () =>
    speaker.speak(question.audioText, languageInfo[draft.language].locale, { rate: 0.9 });

  useEffect(play, [question.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ gap: spacing.md }}>
      <Pill label={question.level} tone="accent" />
      <Text variant="headline">{t('onboarding.listenPrompt')}</Text>
      <Button
        variant="secondary"
        icon="speaker"
        label={t('common.listen')}
        onPress={play}
        testID="placement-listen"
      />
      {question.options.map((option, index) => (
        <ChoiceCard
          key={option}
          testID={`placement-option-${index}`}
          title={option}
          selected={chosen === index || (chosen !== null && index === question.answerIndex)}
          tone={chosen === null ? 'accent' : index === question.answerIndex ? 'success' : 'danger'}
          trailing={
            chosen !== null && index === question.answerIndex ? (
              <Icon name="checkCircle" size={20} color={colors.success} />
            ) : null
          }
          onPress={() => chosen === null && setChosen(index)}
        />
      ))}
      <Button
        testID="placement-continue"
        label={t('common.continue')}
        disabled={chosen === null}
        onPress={() =>
          onAnswer({ questionId: question.id, kind: 'listening', chosenIndex: chosen ?? -1 })
        }
      />
    </View>
  );
}

function SpeakingQuestion({
  question,
  onAnswer,
}: {
  question: Extract<PlacementQuestion, { kind: 'speaking' }>;
  onAnswer: (answer: PlacementAnswer) => void;
}) {
  const { colors, spacing } = useTheme();
  const { draft } = useOnboardingDraft();
  const locale = languageInfo[draft.language].locale;
  const { attempt, state } = useSpeakingAttempt(locale);

  return (
    <View style={{ gap: spacing.md, flex: 1 }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Pill label={question.level} tone="accent" />
        <RecognizerBadge kind={state.recognizer} />
      </View>
      <Text variant="headline">{t('onboarding.speakPrompt')}</Text>
      <Card style={{ gap: spacing.sm }}>
        {state.result ? (
          <ScoredSentence result={state.result} />
        ) : (
          <Text variant="target">{question.sentence}</Text>
        )}
        <Text color="textMuted">{question.translation}</Text>
      </Card>
      <View style={{ flex: 1 }} />
      <View style={{ alignItems: 'center' }}>
        <Waveform
          volume={attempt.volume}
          active={state.phase === 'listening'}
          color={colors.flame}
        />
        <HoldToTalk
          testID="placement-talk"
          listening={state.phase === 'listening'}
          label={t('onboarding.holdToSpeak')}
          onPressIn={() => void attempt.start(question.sentence, locale)}
          onPressOut={() => attempt.stop()}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Button
            variant="secondary"
            label={t('common.skip')}
            onPress={() => onAnswer({ questionId: question.id, kind: 'skipped' })}
            testID="placement-skip"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            testID="placement-continue"
            label={t('common.continue')}
            disabled={!state.result}
            onPress={() =>
              onAnswer({
                questionId: question.id,
                kind: 'speaking',
                score: state.result?.overall ?? 0,
              })
            }
          />
        </View>
      </View>
    </View>
  );
}

function PlacementResultView({
  result,
  onContinue,
}: {
  result: PlacementResult;
  onContinue: () => void;
}) {
  const { colors, radii, spacing } = useTheme();
  return (
    <View testID="placement-result" style={{ gap: spacing.lg }}>
      <Card style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl }}>
        <Text variant="hero" color="accent">
          {result.level}
        </Text>
        <Text variant="title" align="center">
          {t('onboarding.resultTitle', { level: result.level })}
        </Text>
        <Text color="textMuted" align="center">
          {t('onboarding.resultBody')}
        </Text>
      </Card>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {result.ladder.map((rung) => (
          <View
            key={rung.level}
            style={{
              flex: 1,
              alignItems: 'center',
              gap: spacing.xs,
              padding: spacing.md,
              borderRadius: radii.md,
              backgroundColor: rung.passed ? colors.successSoft : colors.surfaceSunken,
            }}>
            <Icon
              name={rung.passed ? 'checkCircle' : 'lock'}
              size={18}
              color={rung.passed ? colors.success : colors.textFaint}
            />
            <Text variant="headline">{rung.level}</Text>
          </View>
        ))}
      </View>
      <Button testID="placement-done" label={t('common.continue')} onPress={onContinue} />
    </View>
  );
}
