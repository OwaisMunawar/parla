import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { t } from '@/core/i18n/translate';
import { useTheme } from '@/core/theme';
import { Text } from '@/core/ui';

import { type PronunciationResult, type WordVerdict } from '../lib/score';

/**
 * The target sentence with every word coloured by its score. Colour is never
 * the only signal: missed words are also underlined and every word carries
 * an accessibility label with its verdict.
 */
export function ScoredSentence({ result }: { result: PronunciationResult }) {
  const { colors, radii, spacing } = useTheme();
  const tone: Record<WordVerdict, { fg: string; bg: string }> = {
    good: { fg: colors.success, bg: colors.successSoft },
    close: { fg: colors.warning, bg: colors.warningSoft },
    missed: { fg: colors.danger, bg: colors.dangerSoft },
  };
  return (
    <View testID="scored-sentence" style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {result.words.map((word, index) => (
          <Animated.View
            key={`${word.word}-${index}`}
            entering={FadeIn.delay(index * 70)}
            accessible
            accessibilityLabel={`${word.word}: ${word.verdict}${word.heard && word.heard !== word.word ? `, heard ${word.heard}` : ''}`}
            style={{
              paddingHorizontal: spacing.sm + 2,
              paddingVertical: spacing.xs,
              borderRadius: radii.sm,
              backgroundColor: tone[word.verdict].bg,
            }}>
            <Text
              variant="target"
              style={{
                color: tone[word.verdict].fg,
                fontWeight: '800',
                textDecorationLine: word.verdict === 'missed' ? 'underline' : 'none',
              }}>
              {word.word}
            </Text>
          </Animated.View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.lg }}>
        {(['good', 'close', 'missed'] as const).map((verdict) => (
          <View
            key={verdict}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <View
              style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tone[verdict].fg }}
            />
            <Text variant="caption" color="textMuted">
              {t(
                verdict === 'good'
                  ? 'drill.legendGood'
                  : verdict === 'close'
                    ? 'drill.legendClose'
                    : 'drill.legendMissed',
              )}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
