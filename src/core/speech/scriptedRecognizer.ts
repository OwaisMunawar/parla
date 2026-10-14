import { AppError } from '@/core/errors/AppError';

import {
  type RecognitionListener,
  type RecognitionRequest,
  type SpeechRecognizer,
} from './SpeechRecognizer';

/**
 * Stands in for the recogniser where none is available (CI, Jest, a
 * simulator without speech support). It "hears" the request's expected text,
 * word by word, with a synthetic volume envelope. The UI labels it as
 * scripted wherever a transcript is shown, so a demo never passes it off as
 * real recognition.
 */
export function createScriptedRecognizer(
  options: { wordMs?: number; confidence?: number; schedule?: typeof setTimeout } = {},
): SpeechRecognizer {
  const wordMs = options.wordMs ?? 180;
  const confidence = options.confidence ?? 0.9;
  const schedule = options.schedule ?? setTimeout;

  return {
    kind: 'scripted',
    prepare: async () => ({ available: true, kind: 'scripted' }),
    requestPermission: async () => true,
    start(request: RecognitionRequest, listener: RecognitionListener) {
      const words = (request.expected ?? '').split(/\s+/).filter(Boolean);
      let index = 0;
      let done = false;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const finish = () => {
        if (done) return;
        done = true;
        if (timer) clearTimeout(timer);
        if (words.length === 0) {
          listener.onError(new AppError('SPEECH_NO_MATCH', 'Nothing scripted for this prompt.'));
        } else {
          listener.onFinal({
            transcript: words.join(' '),
            confidence,
            words: words.map((text) => ({ text, confidence })),
          });
        }
        listener.onEnd?.();
      };

      const step = () => {
        if (done) return;
        if (index >= words.length) return finish();
        index++;
        listener.onVolume?.(0.35 + 0.5 * Math.abs(Math.sin(index * 1.7)));
        listener.onInterim?.(words.slice(0, index).join(' '));
        timer = schedule(step, wordMs);
      };
      timer = schedule(step, wordMs);

      return {
        stop: finish,
        abort: () => {
          if (done) return;
          done = true;
          if (timer) clearTimeout(timer);
          listener.onEnd?.();
        },
      };
    },
  };
}
