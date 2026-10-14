import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionErrorCode,
  type ExpoSpeechRecognitionOptions,
} from 'expo-speech-recognition';
import { Platform } from 'react-native';

import { AppError, toAppError, type ErrorCode } from '@/core/errors/AppError';

import {
  type Recognition,
  type RecognitionListener,
  type RecognitionRequest,
  type RecognitionSession,
  type RecognizerKind,
  type SpeechRecognizer,
} from './SpeechRecognizer';

/**
 * Start-up failures worth a retry rather than an error on screen: a missing
 * on-device model, a recogniser that reports itself unavailable for a moment
 * after it is created for a locale ("Failed to initialize recognizer"), and
 * an audio session still held by the tutor's voice. Speech-level outcomes
 * such as "no speech" are never retried.
 */
const RETRYABLE = new Set<ExpoSpeechRecognitionErrorCode>([
  'language-not-supported',
  'service-not-allowed',
  'unknown',
  'busy',
  'audio-capture',
]);

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

/** A request the native recogniser can serve from a file instead of the mic. */
export type NativeRecognitionRequest = RecognitionRequest & { audioUri?: string };

const errorCodes: Partial<Record<ExpoSpeechRecognitionErrorCode, ErrorCode>> = {
  'not-allowed': 'SPEECH_PERMISSION_DENIED',
  'service-not-allowed': 'SPEECH_UNAVAILABLE',
  'language-not-supported': 'SPEECH_UNAVAILABLE',
  'no-speech': 'SPEECH_NO_MATCH',
  'speech-timeout': 'SPEECH_NO_MATCH',
  aborted: 'CANCELLED',
};

/**
 * expo-speech-recognition behind the SpeechRecognizer interface.
 *
 * On-device recognition is requested whenever the platform reports it, so a
 * learner's voice stays on the phone where possible. If the on-device model
 * for the language is missing, one retry goes to the platform's server
 * recogniser rather than failing the turn; `kind` reports which one ran.
 */
export type NativeRecognizer = SpeechRecognizer & {
  start(request: NativeRecognitionRequest, listener: RecognitionListener): RecognitionSession;
};

export function createNativeRecognizer(): NativeRecognizer {
  let kind: RecognizerKind = 'cloud';

  return {
    get kind() {
      return kind;
    },

    async prepare() {
      const available = ExpoSpeechRecognitionModule.isRecognitionAvailable();
      kind =
        available && ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()
          ? 'on-device'
          : 'cloud';
      return { available, kind };
    },

    async requestPermission() {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      return result.granted;
    },

    start(request: NativeRecognitionRequest, listener: RecognitionListener) {
      let finished = false;
      let latestInterim = '';
      let retries = 0;
      // Between a refused start and the retry, the stale session's 'end'
      // must not be read as "nothing was heard".
      let relaunching = false;
      const subscriptions: { remove(): void }[] = [];

      const finish = (deliver: () => void) => {
        if (finished) return;
        finished = true;
        subscriptions.forEach((s) => s.remove());
        deliver();
        listener.onEnd?.();
      };

      const launch = (onDevice: boolean) => {
        const options: ExpoSpeechRecognitionOptions = {
          lang: request.locale,
          interimResults: true,
          // Hold to talk: keep listening through pauses until the button is released.
          continuous: request.audioUri === undefined,
          addsPunctuation: true,
          maxAlternatives: 1,
          requiresOnDeviceRecognition: onDevice,
          contextualStrings: request.contextualStrings,
          volumeChangeEventOptions: { enabled: true, intervalMillis: 80 },
          iosTaskHint: 'dictation',
          ...(request.audioUri
            ? {
                audioSource: {
                  uri: request.audioUri,
                  // Bundled clips are 16 kHz mono PCM, the format Android expects.
                  sampleRate: 16_000,
                  audioChannels: 1,
                  chunkDelayMillis: Platform.OS === 'android' ? 15 : undefined,
                },
              }
            : {}),
        };
        ExpoSpeechRecognitionModule.start(options);
      };

      subscriptions.push(
        ExpoSpeechRecognitionModule.addListener('volumechange', ({ value }) => {
          listener.onVolume?.(Math.min(1, Math.max(0, (value + 2) / 12)));
        }),
        ExpoSpeechRecognitionModule.addListener('result', (event) => {
          const best = event.results[0];
          if (!best) return;
          if (!event.isFinal) {
            latestInterim = best.transcript;
            listener.onInterim?.(best.transcript);
            return;
          }
          const result: Recognition = {
            transcript: best.transcript,
            confidence: best.confidence,
            words: best.segments.map((segment) => ({
              text: segment.segment,
              confidence: segment.confidence,
              startMs: segment.startTimeMillis,
              endMs: segment.endTimeMillis,
            })),
          };
          if (!result.transcript.trim()) return;
          finish(() => listener.onFinal(result));
        }),
        ExpoSpeechRecognitionModule.addListener('error', (event) => {
          if (RETRYABLE.has(event.error) && retries < MAX_RETRIES) {
            // Retry once as-is, then once on the platform's server recogniser
            // in case the on-device model is what is missing.
            retries++;
            relaunching = true;
            if (retries === MAX_RETRIES && kind === 'on-device') kind = 'cloud';
            setTimeout(() => {
              if (!finished) launch(kind === 'on-device');
            }, RETRY_DELAY_MS);
            return;
          }
          const code = errorCodes[event.error] ?? 'SPEECH_FAILED';
          finish(() => listener.onError(new AppError(code, event.message || event.error)));
        }),
        ExpoSpeechRecognitionModule.addListener('start', () => {
          relaunching = false;
        }),
        ExpoSpeechRecognitionModule.addListener('end', () => {
          if (relaunching) return;
          // iOS can end without a final result when the learner releases mid-word;
          // the last interim is still the best transcript we have.
          finish(() =>
            latestInterim.trim()
              ? listener.onFinal({ transcript: latestInterim, confidence: null, words: [] })
              : listener.onError(new AppError('SPEECH_NO_MATCH', 'Nothing was heard.')),
          );
        }),
      );

      try {
        launch(kind === 'on-device');
      } catch (error) {
        finish(() => listener.onError(toAppError(error, 'SPEECH_FAILED')));
      }

      return {
        stop: () => ExpoSpeechRecognitionModule.stop(),
        abort: () => {
          finish(() => undefined);
          ExpoSpeechRecognitionModule.abort();
        },
      };
    },
  };
}
