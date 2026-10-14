import { AppError } from '@/core/errors/AppError';
import { createStore, type Store } from '@/core/lib/store';
import {
  type RecognitionSession,
  type RecognizerKind,
  type SpeechRecognizer,
} from '@/core/speech/SpeechRecognizer';

import { scorePronunciation, type PronunciationResult } from '../lib/score';

export type AttemptState = {
  phase: 'idle' | 'listening' | 'scored';
  interim: string;
  heard: string | null;
  result: PronunciationResult | null;
  error: AppError | null;
  recognizer: RecognizerKind;
  attempts: number;
};

export type SpeakingAttempt = {
  state: Store<AttemptState>;
  volume: Store<number>;
  prepare(locale: string): Promise<void>;
  /** Starts listening for `sentence`; resolves when the attempt is scored or fails. */
  start(sentence: string, locale: string): Promise<PronunciationResult | null>;
  stop(): void;
  reset(): void;
  dispose(): void;
};

/**
 * "Say this sentence and get scored", shared by the drill, the placement's
 * speaking questions and spoken review answers. The target sentence is also
 * handed to the recogniser as a contextual string: biasing towards what the
 * learner is trying to say is fair, because a word it still mishears is one
 * a listener would have trouble with too.
 */
export function createSpeakingAttempt(recognizer: SpeechRecognizer): SpeakingAttempt {
  const initial: AttemptState = {
    phase: 'idle',
    interim: '',
    heard: null,
    result: null,
    error: null,
    recognizer: recognizer.kind,
    attempts: 0,
  };
  const state = createStore<AttemptState>(initial);
  const volume = createStore(0);
  const patch = (next: Partial<AttemptState>) => state.set((s) => ({ ...s, ...next }));
  let session: RecognitionSession | null = null;

  return {
    state,
    volume,

    async prepare(locale) {
      const ready = await recognizer.prepare(locale);
      patch({ recognizer: ready.kind });
    },

    async start(sentence, locale) {
      if (state.get().phase === 'listening') return null;
      if (!(await recognizer.requestPermission())) {
        patch({
          error: new AppError('SPEECH_PERMISSION_DENIED', 'Microphone or speech access is off.'),
        });
        return null;
      }
      patch({ phase: 'listening', interim: '', result: null, heard: null, error: null });

      return new Promise((resolve) => {
        session = recognizer.start(
          { locale, contextualStrings: [sentence], expected: sentence },
          {
            onVolume: (level) => volume.set(level),
            onInterim: (interim) => patch({ interim }),
            onFinal: (recognition) => {
              session = null;
              volume.set(0);
              const result = scorePronunciation(sentence, recognition);
              patch({
                phase: 'scored',
                heard: recognition.transcript,
                result,
                interim: '',
                attempts: state.get().attempts + 1,
                recognizer: recognizer.kind,
              });
              resolve(result);
            },
            onError: (error) => {
              session = null;
              volume.set(0);
              patch({
                phase: 'idle',
                interim: '',
                error: error.code === 'CANCELLED' ? null : error,
              });
              resolve(null);
            },
          },
        );
      });
    },

    stop() {
      session?.stop();
    },

    reset() {
      session?.abort();
      session = null;
      state.set({ ...initial, recognizer: state.get().recognizer, attempts: state.get().attempts });
    },

    dispose() {
      session?.abort();
      session = null;
    },
  };
}
