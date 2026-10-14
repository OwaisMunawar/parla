import { View } from 'react-native';

import { t } from '@/core/i18n/translate';
import { useTheme } from '@/core/theme';
import { Button, Pill, Sheet, Text } from '@/core/ui';

import { type Correction } from '../lib/tutorContract';

export function CorrectionSheet({
  correction,
  saved,
  onSave,
  onClose,
}: {
  correction: Correction | null;
  saved: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  const { colors, spacing } = useTheme();
  return (
    <Sheet visible={correction !== null} onClose={onClose} testID="correction-sheet">
      {correction && (
        <>
          <Pill label={t(`correctionTypes.${correction.type}`)} tone="accent" />
          <View style={{ gap: spacing.sm }}>
            <Text
              variant="target"
              style={{ textDecorationLine: 'line-through', color: colors.danger }}>
              {correction.original}
            </Text>
            <Text variant="target" style={{ color: colors.success, fontWeight: '800' }}>
              {correction.corrected}
            </Text>
          </View>
          <Text color="textMuted">{correction.explanation}</Text>
          <Button
            testID="add-to-review"
            label={saved ? t('conversation.added') : t('conversation.addToReview')}
            icon={saved ? 'checkCircle' : 'plus'}
            variant={saved ? 'secondary' : 'primary'}
            disabled={saved}
            onPress={onSave}
          />
        </>
      )}
    </Sheet>
  );
}
