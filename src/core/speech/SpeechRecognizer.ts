import { type AppError } from '@/core/errors/AppError';

/**
 * What every recogniser hands back. Confidence is null when the platform does
 * not report one (Android segments, iOS partials), which scoring treats as
 * "no evidence either way" rather than as zero.
 */
export type RecognisedWord = {
  text: string;
  confidence: number | null;
  startMs?: number;
  endMs?: number;
};

export type Recognition = {
  transcript: string;
  confidence: number | null;
  words: RecognisedWord[];
};

export type RecognizerKind = 'on-device' | 'cloud' | 'scripted';

export type RecognitionListener = {
  /** 0..1, roughly perceptual. Only fires for live microphone input. */
  onVolume?(level: number): void;
  onInterim?(transcript: string): void;
  onFinal(result: Recognition): void;
  onError(error: AppError): void;
  /** Always fires last, after onFinal or onError. */
  onEnd?(): void;
};

export type RecognitionRequest = {
  /** BCP-47, e.g. "es-ES". */
  locale: string;
  /** Phrases to bias towards: the target sentence in a drill, scenario vocabulary in a chat. */
  contextualStrings?: string[];
  /**
   * Identifies the bundled clip for this prompt. Only the demo recogniser
   * reads it; it lets every "speak" action work on a simulator without a mic.
   */
  clip?: string;
  /** What a scripted recogniser should "hear" for this prompt. */
  expected?: string;
};

export type RecognitionSession = {
  /** Stop listening and deliver a final result for what was heard so far. */
  stop(): void;
  /** Stop without a result. */
  abort(): void;
};

export interface SpeechRecognizer {
  /** Resolved after `prepare`; shown honestly in the UI. */
  readonly kind: RecognizerKind;
  prepare(locale: string): Promise<{ available: boolean; kind: RecognizerKind }>;
  requestPermission(): Promise<boolean>;
  start(request: RecognitionRequest, listener: RecognitionListener): RecognitionSession;
}
