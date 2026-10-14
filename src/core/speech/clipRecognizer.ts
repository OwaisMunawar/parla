import { toAppError } from '@/core/errors/AppError';

import { type NativeRecognizer } from './nativeRecognizer';
import {
  type RecognitionListener,
  type RecognitionRequest,
  type RecognitionSession,
  type SpeechRecognizer,
} from './SpeechRecognizer';

export type ClipResolver = (expected: string) => Promise<string | null>;

/**
 * Demo mode on a simulator: there is no one to speak, so the prompt's bundled
 * clip is fed to the real platform recogniser as an audio file. Everything
 * downstream (interim results, segments, confidence, scoring) is the genuine
 * recogniser output for that recording. Prompts without a clip fall back to
 * the microphone.
 */
export function withBundledClips(
  native: NativeRecognizer,
  resolveClip: ClipResolver,
): SpeechRecognizer {
  return {
    get kind() {
      return native.kind;
    },
    prepare: (locale) => native.prepare(locale),
    requestPermission: () => native.requestPermission(),
    start(request: RecognitionRequest, listener: RecognitionListener) {
      let inner: RecognitionSession | null = null;
      let cancelled = false;
      let fromFile = false;
      let stopRequested = false;

      void (async () => {
        let audioUri: string | null = null;
        try {
          audioUri = request.expected ? await resolveClip(request.expected) : null;
        } catch (error) {
          listener.onError(toAppError(error, 'SPEECH_FAILED'));
          listener.onEnd?.();
          return;
        }
        if (cancelled) return;
        fromFile = audioUri !== null;
        inner = native.start({ ...request, audioUri: audioUri ?? undefined }, listener);
        // Released before the microphone session existed: honour it now.
        if (stopRequested && !fromFile) inner.stop();
      })();

      return {
        // A clip is recognised to its end on its own; releasing the button
        // early must not cut the recording off mid-sentence.
        stop: () => {
          stopRequested = true;
          if (!fromFile) inner?.stop();
        },
        abort: () => {
          cancelled = true;
          inner?.abort();
        },
      };
    },
  };
}

/**
 * Uses `primary` when the platform has a recogniser, `fallback` otherwise.
 * "Has" is decided twice: at `prepare`, and again the first time the
 * platform recogniser refuses to start (a simulator can report speech as
 * available and then fail to initialise it, for example once text to speech
 * has used the audio session). The refused request is replayed
 * on the fallback, and `kind` always names the one in use, which is what the
 * UI shows next to every transcript.
 */
export function withFallback(
  primary: SpeechRecognizer,
  fallback: SpeechRecognizer,
): SpeechRecognizer {
  let active = primary;
  // Once the platform recogniser has produced a result, later failures are
  // real failures and are shown, not papered over with the fallback.
  let primaryWorked = false;
  return {
    get kind() {
      return active.kind;
    },
    async prepare(locale) {
      if (active === fallback) return fallback.prepare(locale);
      try {
        const result = await primary.prepare(locale);
        if (result.available) return result;
      } catch {
        // A missing native module reads as "no recogniser here".
      }
      active = fallback;
      return fallback.prepare(locale);
    },
    requestPermission: () => active.requestPermission(),
    start(request, listener) {
      if (active === fallback) return fallback.start(request, listener);
      let current: RecognitionSession;
      let stopped = false;
      current = primary.start(request, {
        ...listener,
        onFinal: (result) => {
          primaryWorked = true;
          listener.onFinal(result);
        },
        onEnd: () => {
          if (active === primary) listener.onEnd?.();
        },
        onError: (error) => {
          const refusedToStart =
            error.code === 'SPEECH_UNAVAILABLE' ||
            (error.code === 'SPEECH_FAILED' && !primaryWorked);
          if (!refusedToStart) {
            listener.onError(error);
            return;
          }
          active = fallback;
          current = fallback.start(request, listener);
          if (stopped) current.stop();
        },
      });
      return {
        stop: () => {
          stopped = true;
          current.stop();
        },
        abort: () => current.abort(),
      };
    },
  };
}
