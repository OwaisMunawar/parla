import { t } from '@/core/i18n/translate';
import { type RecognizerKind } from '@/core/speech/SpeechRecognizer';

import { Pill } from './Pill';

/**
 * Names the recogniser that produced a transcript. The scripted one gets a
 * warning tone on purpose: a demo should never pass off scripted text as
 * real recognition.
 */
export function RecognizerBadge({ kind }: { kind: RecognizerKind }) {
  return (
    <Pill
      testID="recognizer-badge"
      label={t(`recognizer.${kind}`)}
      icon={kind === 'on-device' ? 'chip' : kind === 'cloud' ? 'cloud' : 'info'}
      tone={kind === 'scripted' ? 'warning' : 'neutral'}
    />
  );
}
