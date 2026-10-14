import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useServices } from '@/composition/ServicesProvider';
import { type CefrLevel, type Language } from '@/core/content/languages';
import { t } from '@/core/i18n/translate';
import { useTheme } from '@/core/theme';
import { Button, Card, Celebration, HoldToTalk, IconButton, Pill, Text, Waveform } from '@/core/ui';
import { RecognizerBadge } from '@/core/ui/RecognizerBadge';
import { speechErrorText } from '@/core/speech/speechErrorText';

import { CorrectionSheet } from '../components/CorrectionSheet';
import { MessageBubble } from '../components/MessageBubble';
import { type Scenario } from '../content';
import { type ChatMessage } from '../data/conversationRepository';
import { useConversationSession } from '../hooks/useConversationSession';
import { type Correction } from '../lib/tutorContract';

const STATUS = {
  idle: 'conversation.hold',
  listening: 'conversation.listening',
  thinking: 'conversation.thinking',
  speaking: 'conversation.speaking',
  done: 'conversation.done',
  blocked: 'conversation.blockedTitle',
} as const;

export function ConversationScreen({
  scenario,
  language,
  level,
}: {
  scenario: Scenario;
  language: Language;
  level: CefrLevel;
}) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tutor } = useServices();
  const { session, state } = useConversationSession(scenario, language, level);
  const [open, setOpen] = useState<{ message: ChatMessage; correction: Correction } | null>(null);
  const scroll = useRef<ScrollView>(null);

  // Keyed by the milestone, so each one mounts a fresh burst exactly once.
  const milestone =
    state.phase === 'done'
      ? 'done'
      : state.lastOutcome?.goalJustReached
        ? `goal-${state.turn}`
        : null;

  useEffect(() => {
    if (state.phase === 'blocked')
      router.push({ pathname: '/paywall', params: { source: 'quota' } });
  }, [router, state.phase]);

  const step = scenario.steps[Math.min(state.turn, scenario.steps.length - 1)];
  const errorText = speechErrorText(state.error);

  return (
    <View
      testID="conversation-screen"
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.sm,
        }}>
        <IconButton icon="close" label={t('common.close')} onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Text variant="headline">{scenario.title}</Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {scenario.tutorRole}
          </Text>
        </View>
        <Pill label={`+${state.xp} XP`} tone="flame" icon="bolt" />
      </View>

      <ScrollView
        ref={scroll}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          <RecognizerBadge kind={state.recognizer} />
          <Pill
            label={t(`tutor.${tutor.kind}`)}
            icon="sparkles"
            tone={tutor.kind === 'scripted' ? 'warning' : 'accent'}
          />
        </View>
        {state.messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onReplay={() => session.replay(message)}
            onCorrection={(correction) => setOpen({ message, correction })}
          />
        ))}
        {state.streaming && (
          <MessageBubble
            streaming
            message={{
              id: 'streaming',
              role: 'tutor',
              text: state.streaming,
              translation: null,
              corrections: [],
            }}
          />
        )}
        {state.phase === 'done' && (
          <Card testID="conversation-done" style={{ gap: spacing.sm, alignItems: 'center' }}>
            <Text variant="title">{t('conversation.done')}</Text>
            <Text color="textMuted" align="center">
              {t('conversation.doneBody', { xp: state.xp })}
            </Text>
            <Button
              label={t('common.done')}
              onPress={() => router.back()}
              testID="conversation-finish"
            />
          </Card>
        )}
      </ScrollView>

      {state.phase !== 'done' && (
        <View
          style={{
            paddingHorizontal: spacing.lg,
            paddingBottom: insets.bottom + spacing.sm,
            paddingTop: spacing.sm,
            borderTopWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            gap: spacing.xs,
            alignItems: 'center',
          }}>
          <Text
            testID="interim-transcript"
            variant="callout"
            color={state.interim ? 'text' : 'textFaint'}
            align="center"
            numberOfLines={2}>
            {state.interim || (errorText ?? t('conversation.hint', { hint: step?.hint ?? '' }))}
          </Text>
          <Waveform
            volume={session.volume}
            active={state.phase === 'listening'}
            color={colors.flame}
          />
          <HoldToTalk
            listening={state.phase === 'listening'}
            disabled={state.phase === 'thinking'}
            label={t(STATUS[state.phase])}
            onPressIn={() => void session.pressIn()}
            onPressOut={() => session.pressOut()}
          />
        </View>
      )}

      <CorrectionSheet
        correction={open?.correction ?? null}
        saved={open ? state.saved.includes(open.correction.corrected) : false}
        onSave={() => open && void session.saveCorrection(open.message, open.correction)}
        onClose={() => setOpen(null)}
      />
      {milestone && <Celebration key={milestone} play />}
    </View>
  );
}
