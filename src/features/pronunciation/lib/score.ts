import { type Recognition, type RecognisedWord } from '@/core/speech/SpeechRecognizer';

import { alignWords, type AlignmentOp } from './alignment';
import { tokenize, type Token } from './tokenize';

/**
 * Pronunciation feedback from two signals the recogniser already gives us:
 *
 * 1. Whether it heard the word you meant to say (the alignment). If the
 *    recogniser, biased towards the target sentence, still heard a different
 *    word, a native listener probably would too.
 * 2. How sure it was (segment confidence). A word it matched with low
 *    confidence was understood, but only just.
 *
 * This is intelligibility, not phoneme-level accuracy, and the README says so.
 * It needs no model download, works offline and costs nothing per attempt.
 */
export type WordVerdict = 'good' | 'close' | 'missed';

export type WordScore = {
  word: string;
  heard: string | null;
  score: number;
  verdict: WordVerdict;
  /** Short reason for the tooltip under a coloured word. */
  reason: 'clear' | 'low-confidence' | 'accent' | 'near-miss' | 'different-word' | 'not-heard';
};

export type PronunciationResult = {
  words: WordScore[];
  extras: string[];
  /** 0..100, rounded. */
  overall: number;
  verdict: 'great' | 'good' | 'keep-practising';
};

const GOOD = 0.8;
const CLOSE = 0.5;
const EXTRA_PENALTY = 0.05;

/** iOS reports 0 for unknown, Android -1. Both mean "no signal". */
export function usableConfidence(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) return null;
  return Math.min(1, value);
}

function confidenceFactor(confidence: number | null): number {
  // Confidence only shades a match, it never turns a heard word into a miss:
  // recogniser confidence is noisy and drops for short function words.
  return confidence === null ? 1 : 0.6 + 0.4 * confidence;
}

function verdictFor(score: number): WordVerdict {
  if (score >= GOOD) return 'good';
  if (score >= CLOSE) return 'close';
  return 'missed';
}

type HeardToken = Token & { confidence: number | null };

/**
 * Word timings and confidences come from segments when the platform gives
 * them. Otherwise every word inherits the utterance confidence.
 */
export function heardTokens(recognition: Recognition): HeardToken[] {
  const fromSegments = recognition.words.flatMap((word: RecognisedWord) =>
    tokenize(word.text).map((token) => ({
      ...token,
      confidence: usableConfidence(word.confidence),
    })),
  );
  if (fromSegments.length > 0) return fromSegments;
  const fallback = usableConfidence(recognition.confidence);
  return tokenize(recognition.transcript).map((token) => ({ ...token, confidence: fallback }));
}

type ScoredOp = Exclude<AlignmentOp, { kind: 'extra' }>;

function scoreOp(op: ScoredOp, target: readonly Token[], heard: readonly HeardToken[]) {
  switch (op.kind) {
    case 'match': {
      const word = heard[op.heardIndex]!;
      const factor = confidenceFactor(word.confidence);
      const base = op.exact ? 1 : 0.8;
      const score = base * factor;
      const reason: WordScore['reason'] = !op.exact
        ? 'accent'
        : score < GOOD
          ? 'low-confidence'
          : 'clear';
      return { word: target[op.targetIndex]!.display, heard: word.display, score, reason };
    }
    case 'substitution': {
      const near = op.similarity >= 0.6;
      return {
        word: target[op.targetIndex]!.display,
        heard: heard[op.heardIndex]!.display,
        score: near ? 0.5 + 0.25 * op.similarity : 0.4 * op.similarity,
        reason: near ? ('near-miss' as const) : ('different-word' as const),
      };
    }
    case 'missed':
      return {
        word: target[op.targetIndex]!.display,
        heard: null,
        score: 0,
        reason: 'not-heard' as const,
      };
  }
}

export function scorePronunciation(targetSentence: string, recognition: Recognition) {
  const target = tokenize(targetSentence);
  const heard = heardTokens(recognition);
  const ops = alignWords(target, heard);

  const words: WordScore[] = ops
    .filter((op): op is ScoredOp => op.kind !== 'extra')
    .map((op) => {
      const scored = scoreOp(op, target, heard);
      const score = round2(scored.score);
      return { ...scored, score, verdict: verdictFor(score) };
    });
  const extras = ops.flatMap((op) => (op.kind === 'extra' ? [heard[op.heardIndex]!.display] : []));

  const mean = words.length === 0 ? 0 : words.reduce((sum, w) => sum + w.score, 0) / words.length;
  const overall = Math.round(Math.max(0, mean - extras.length * EXTRA_PENALTY) * 100);
  const verdict: PronunciationResult['verdict'] =
    overall >= 85 ? 'great' : overall >= 60 ? 'good' : 'keep-practising';

  return { words, extras, overall, verdict } satisfies PronunciationResult;
}

/** Same comparison the aligner uses, for "did they say the answer" checks in review. */
export function sameWords(a: string, b: string): boolean {
  const left = tokenize(a).map((t) => t.loose);
  const right = tokenize(b).map((t) => t.loose);
  return left.length === right.length && left.every((word, index) => word === right[index]);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
