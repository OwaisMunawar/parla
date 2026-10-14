import { cefrAt, cefrIndex, type CefrLevel } from '@/core/content/languages';

/**
 * The five-question placement: a ladder from A1 to B2, mixing listening
 * (tap the right meaning of what you hear) and speaking (repeat a sentence,
 * scored by the same aligner the drills use).
 *
 * Placement only sets a starting point. It errs low on purpose: a learner
 * placed too high meets a tutor speaking past them and quits, while one placed
 * too low is promoted by the tutor's level estimates within a few chats.
 */
export type PlacementQuestion =
  | {
      id: string;
      kind: 'listening';
      level: CefrLevel;
      /** Read aloud by TTS. */
      audioText: string;
      options: readonly string[];
      answerIndex: number;
    }
  | {
      id: string;
      kind: 'speaking';
      level: CefrLevel;
      sentence: string;
      translation: string;
    };

export type PlacementAnswer =
  | { questionId: string; kind: 'listening'; chosenIndex: number }
  | { questionId: string; kind: 'speaking'; score: number }
  | { questionId: string; kind: 'skipped' };

export type PlacementResult = {
  level: CefrLevel;
  /** 0..1 credit per level reached, for the result screen's ladder. */
  ladder: { level: CefrLevel; credit: number; passed: boolean }[];
  correct: number;
  total: number;
};

/** Speaking score (0..100) that counts as a pass. */
export const SPEAKING_PASS = 70;
const LEVEL_PASS = 0.5;

function creditFor(question: PlacementQuestion, answer: PlacementAnswer | undefined): number {
  if (!answer || answer.kind === 'skipped') return 0;
  if (question.kind === 'listening' && answer.kind === 'listening') {
    return answer.chosenIndex === question.answerIndex ? 1 : 0;
  }
  if (question.kind === 'speaking' && answer.kind === 'speaking') {
    // Partial credit below the pass mark, so a nervous but close attempt at
    // a B1 sentence still counts for something on the ladder.
    if (answer.score >= SPEAKING_PASS) return 1;
    return Math.max(0, answer.score / 100) * 0.6;
  }
  return 0;
}

export function scorePlacement(
  questions: readonly PlacementQuestion[],
  answers: readonly PlacementAnswer[],
): PlacementResult {
  const byId = new Map(answers.map((answer) => [answer.questionId, answer]));
  const perLevel = new Map<CefrLevel, number[]>();
  let correct = 0;

  for (const question of questions) {
    const credit = creditFor(question, byId.get(question.id));
    if (credit >= 1) correct++;
    perLevel.set(question.level, [...(perLevel.get(question.level) ?? []), credit]);
  }

  const levels = [...perLevel.keys()].sort((a, b) => cefrIndex(a) - cefrIndex(b));
  const ladder = levels.map((level) => {
    const credits = perLevel.get(level) ?? [];
    const credit = credits.reduce((sum, c) => sum + c, 0) / Math.max(1, credits.length);
    return { level, credit, passed: credit >= LEVEL_PASS };
  });

  // The ladder stops at the first level not passed: acing B2 listening after
  // failing A2 is a lucky tap, not a B2 learner.
  let reached = -1;
  for (const rung of ladder) {
    if (!rung.passed) break;
    reached = cefrIndex(rung.level);
  }

  // The highest level passed, not the one above it: see the note on erring low.
  const level = reached < 0 ? 'A1' : cefrAt(reached);
  return { level, ladder, correct, total: questions.length };
}
