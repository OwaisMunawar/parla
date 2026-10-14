import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { useLiveQuery, useServices } from '@/composition/ServicesProvider';
import { languageInfo, type Language } from '@/core/content/languages';
import { t } from '@/core/i18n/translate';
import { speechErrorText } from '@/core/speech/speechErrorText';
import { RecognizerBadge } from '@/core/ui/RecognizerBadge';
import { useTheme } from '@/core/theme';
import {
  Button,
  Card,
  EmptyState,
  HoldToTalk,
  Pill,
  ProgressBar,
  Screen,
  Text,
  Waveform,
} from '@/core/ui';

import { XP } from '../../progress/lib/xp';
import { ScoredSentence } from '../../pronunciation/components/ScoredSentence';
import { useSpeakingAttempt } from '../../pronunciation/hooks/useSpeakingAttempt';
import { type ReviewCard } from '../data/reviewRepository';
import { GradeButtons } from '../components/GradeButtons';
import { type Grade } from '../lib/scheduler';

export function ReviewScreen({ language }: { language: Language }) {
  const { colors, spacing } = useTheme();
  const services = useServices();
  const [queue, setQueue] = useState<ReviewCard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(0);
  const { data: counts } = useLiveQuery(`counts:${language}`, ['review', 'entitlement'], (s) =>
    s.review.counts(language),
  );

  // The session's queue is fixed when it starts, so grading a learning card
  // (due again in a minute) does not reshuffle the cards still ahead.
  useEffect(() => {
    let alive = true;
    void services.review.queue(language).then((cards) => {
      if (!alive) return;
      setQueue(cards);
      setIndex(0);
    });
    return () => {
      alive = false;
    };
  }, [language, services.review]);

  const card = queue?.[index];

  const grade = async (value: Grade) => {
    if (!card) return;
    await services.review.grade(card, value);
    await services.progress.record({ kind: 'review', xp: XP.reviewCard, language, refId: card.id });
    services.changes.emit('review');
    services.changes.emit('progress');
    setDone((n) => n + 1);
    setIndex((i) => i + 1);
  };

  return (
    <Screen scroll tabBar testID="review-screen">
      <Text variant="display">{t('review.title')}</Text>
      {counts && (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Pill label={`${t('review.new')} ${counts.new}`} tone="accent" />
          <Pill label={`${t('review.learning')} ${counts.learning}`} tone="warning" />
          <Pill label={`${t('review.reviewing')} ${counts.review}`} tone="success" />
        </View>
      )}
      {queue && queue.length > 0 && (
        <ProgressBar progress={Math.min(1, index / queue.length)} color={colors.success} />
      )}

      {queue === null ? null : card ? (
        <ReviewCardView
          key={card.id}
          card={card}
          language={language}
          onGrade={(g) => void grade(g)}
        />
      ) : done > 0 ? (
        <EmptyState
          icon="checkCircle"
          title={t('review.finished')}
          message={t('review.finishedBody', { count: done })}
        />
      ) : (
        <EmptyState icon="cards" title={t('review.empty')} message={t('review.emptyBody')} />
      )}
    </Screen>
  );
}

function ReviewCardView({
  card,
  language,
  onGrade,
}: {
  card: ReviewCard;
  language: Language;
  onGrade: (grade: Grade) => void;
}) {
  const { colors, spacing } = useTheme();
  const services = useServices();
  const locale = languageInfo[language].locale;
  const { attempt, state } = useSpeakingAttempt(locale);
  const [revealed, setRevealed] = useState(false);
  const preview = services.review.preview(card);
  const passed = (state.result?.overall ?? 0) >= 80;

  return (
    <Animated.View entering={FadeInRight.springify().damping(18)} style={{ gap: spacing.lg }}>
      <Card testID="review-card" style={{ gap: spacing.md, minHeight: 200 }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pill
            label={card.kind === 'phrase' ? t('review.kindPhrase') : t('review.kindVocabulary')}
            tone={card.kind === 'phrase' ? 'flame' : 'accent'}
          />
          <RecognizerBadge kind={state.recognizer} />
        </View>
        <Text variant="title" testID="review-prompt">
          {card.prompt}
        </Text>
        {state.result ? <ScoredSentence result={state.result} /> : null}
        {revealed || state.result ? (
          <View style={{ gap: spacing.xs }}>
            <Text
              variant="target"
              style={{ color: colors.success, fontWeight: '800' }}
              testID="review-answer">
              {card.answer}
            </Text>
            {card.note ? (
              <Text variant="callout" color="textMuted">
                {card.note}
              </Text>
            ) : null}
          </View>
        ) : null}
        {state.result ? (
          <Pill
            label={passed ? t('review.correct') : t('review.notQuite')}
            tone={passed ? 'success' : 'danger'}
            icon={passed ? 'checkCircle' : 'info'}
          />
        ) : null}
      </Card>

      {revealed || state.result ? (
        <GradeButtons preview={preview} now={services.clock.now().getTime()} onGrade={onGrade} />
      ) : (
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          {state.error ? (
            <Text variant="callout" color="danger" align="center" testID="review-error">
              {speechErrorText(state.error)}
            </Text>
          ) : null}
          <Waveform
            volume={attempt.volume}
            active={state.phase === 'listening'}
            color={colors.flame}
          />
          <HoldToTalk
            testID="review-talk"
            size={72}
            listening={state.phase === 'listening'}
            label={state.phase === 'listening' ? t('conversation.listening') : t('review.sayIt')}
            onPressIn={() => void attempt.start(card.answer, locale)}
            onPressOut={() => attempt.stop()}
          />
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Button
              compact
              variant="secondary"
              icon="speaker"
              label={t('common.listen')}
              onPress={() => services.speaker.speak(card.answer, locale)}
            />
            <Button
              compact
              variant="secondary"
              label={t('review.reveal')}
              onPress={() => setRevealed(true)}
              testID="review-reveal"
            />
          </View>
        </View>
      )}
    </Animated.View>
  );
}
