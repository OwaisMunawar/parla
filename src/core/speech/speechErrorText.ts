import { type AppError } from '@/core/errors/AppError';
import { t } from '@/core/i18n/translate';

/** One line for any speech failure, shared by every screen with a talk button. */
export function speechErrorText(error: AppError | null): string | null {
  if (!error) return null;
  switch (error.code) {
    case 'SPEECH_NO_MATCH':
      return t('conversation.noSpeech');
    case 'SPEECH_PERMISSION_DENIED':
      return t('conversation.permission');
    case 'SPEECH_UNAVAILABLE':
    case 'SPEECH_FAILED':
      return t('conversation.speechFailed');
    default:
      return t('conversation.tutorError');
  }
}
