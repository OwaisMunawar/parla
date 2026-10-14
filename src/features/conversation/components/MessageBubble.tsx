import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { t } from '@/core/i18n/translate';
import { useTheme } from '@/core/theme';
import { IconButton, ScalePressable, Text } from '@/core/ui';

import { type ChatMessage } from '../data/conversationRepository';
import { markCorrections } from '../lib/scriptedTurn';
import { type Correction } from '../lib/tutorContract';

export function MessageBubble({
  message,
  streaming,
  onReplay,
  onCorrection,
}: {
  message:
    ChatMessage | { role: 'tutor'; text: string; id: string; translation: null; corrections: [] };
  streaming?: boolean;
  onReplay?: () => void;
  onCorrection?: (correction: Correction) => void;
}) {
  const { colors, radii, spacing } = useTheme();
  const [showTranslation, setShowTranslation] = useState(false);
  const tutor = message.role === 'tutor';

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(18)}
      testID={`message-${message.role}`}
      style={{
        alignSelf: tutor ? 'flex-start' : 'flex-end',
        maxWidth: '86%',
        gap: spacing.xs,
      }}>
      <View
        style={{
          backgroundColor: tutor ? colors.surface : colors.accent,
          borderRadius: radii.lg,
          borderBottomLeftRadius: tutor ? radii.sm / 2 : radii.lg,
          borderBottomRightRadius: tutor ? radii.lg : radii.sm / 2,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderWidth: tutor ? 1.5 : 0,
          borderColor: colors.border,
          gap: spacing.sm,
        }}>
        {tutor ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
            <Text variant="bodyStrong" style={{ flexShrink: 1, opacity: streaming ? 0.6 : 1 }}>
              {message.text}
            </Text>
            {onReplay && !streaming && (
              <IconButton
                icon="speaker"
                label={t('common.listen')}
                size={30}
                tone="accent"
                onPress={onReplay}
              />
            )}
          </View>
        ) : (
          <LearnerText message={message as ChatMessage} onCorrection={onCorrection} />
        )}
        {tutor && showTranslation && message.translation ? (
          <Text variant="callout" color="textMuted">
            {message.translation}
          </Text>
        ) : null}
      </View>
      {tutor && message.translation && !streaming ? (
        <Text
          variant="caption"
          color="textFaint"
          accessibilityRole="button"
          onPress={() => setShowTranslation((v) => !v)}>
          {showTranslation ? t('conversation.hideTranslation') : t('conversation.translation')}
        </Text>
      ) : null}
    </Animated.View>
  );
}

/**
 * The learner's line with each mistake struck through and the fix beside it,
 * so the correction is read in place rather than in a list underneath.
 */
function LearnerText({
  message,
  onCorrection,
}: {
  message: ChatMessage;
  onCorrection?: (correction: Correction) => void;
}) {
  const { colors, radii, spacing } = useTheme();
  const segments = markCorrections(message.text, message.corrections);
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="bodyStrong" style={{ color: colors.onAccent }}>
        {segments.map((segment, index) =>
          segment.correction ? (
            <Text
              key={index}
              variant="bodyStrong"
              style={{ color: colors.onAccent, textDecorationLine: 'line-through', opacity: 0.75 }}>
              {segment.text}
            </Text>
          ) : (
            <Text key={index} variant="bodyStrong" style={{ color: colors.onAccent }}>
              {segment.text}
            </Text>
          ),
        )}
      </Text>
      {message.corrections.map((correction) => (
        <ScalePressable
          key={correction.original}
          testID="correction-chip"
          accessibilityRole="button"
          accessibilityLabel={`${correction.original} should be ${correction.corrected}. ${t('conversation.correction')}`}
          onPress={() => onCorrection?.(correction)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            alignSelf: 'flex-start',
            backgroundColor: colors.surface,
            borderRadius: radii.pill,
            paddingVertical: spacing.xs + 1,
            paddingHorizontal: spacing.md,
          }}>
          <Text variant="callout" style={{ color: colors.success, fontWeight: '800' }}>
            {correction.corrected}
          </Text>
          <Text variant="caption" color="accent" style={{ fontWeight: '800' }}>
            {t('conversation.correction')}
          </Text>
        </ScalePressable>
      ))}
    </View>
  );
}
