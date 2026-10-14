import { similarity } from '@/core/lib/editDistance';

import { type Token } from './tokenize';

/**
 * Word-level alignment of the sentence the learner was asked to say against
 * the words the recogniser heard.
 *
 * It is Levenshtein over words rather than characters, with one change: a
 * substitution between similar words ("gracia" for "gracias") costs less than
 * one between unrelated words. Without that, the aligner is free to pair a
 * near miss with the wrong neighbour when the learner also drops a word, and
 * the feedback would highlight the wrong part of the sentence.
 */
export type AlignmentOp =
  | {
      kind: 'match';
      targetIndex: number;
      heardIndex: number;
      /** False when only the accents differ, e.g. "esta" heard for "está". */
      exact: boolean;
    }
  | { kind: 'substitution'; targetIndex: number; heardIndex: number; similarity: number }
  | { kind: 'missed'; targetIndex: number }
  | { kind: 'extra'; heardIndex: number };

const NEAR_MISS = 0.6;
const COST = { insert: 1, delete: 1, near: 0.6, far: 1, accent: 0.2 } as const;

function pairCost(target: Token, heard: Token): number {
  if (target.exact === heard.exact) return 0;
  if (target.loose === heard.loose) return COST.accent;
  return similarity(target.loose, heard.loose) >= NEAR_MISS ? COST.near : COST.far;
}

export function alignWords(target: readonly Token[], heard: readonly Token[]): AlignmentOp[] {
  const rows = target.length + 1;
  const cols = heard.length + 1;
  const cost: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) cost[i]![0] = i * COST.delete;
  for (let j = 0; j < cols; j++) cost[0]![j] = j * COST.insert;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const diagonal = cost[i - 1]![j - 1]! + pairCost(target[i - 1]!, heard[j - 1]!);
      const up = cost[i - 1]![j]! + COST.delete;
      const left = cost[i]![j - 1]! + COST.insert;
      cost[i]![j] = Math.min(diagonal, up, left);
    }
  }

  // Backtrack from the end. Ties prefer the diagonal so a sentence with one
  // wrong word reads as one substitution, not a miss plus an extra.
  const ops: AlignmentOp[] = [];
  let i = target.length;
  let j = heard.length;
  while (i > 0 || j > 0) {
    const here = cost[i]![j]!;
    if (i > 0 && j > 0) {
      const t = target[i - 1]!;
      const h = heard[j - 1]!;
      const pair = pairCost(t, h);
      if (nearlyEqual(here, cost[i - 1]![j - 1]! + pair)) {
        ops.push(
          pair <= COST.accent
            ? { kind: 'match', targetIndex: i - 1, heardIndex: j - 1, exact: pair === 0 }
            : {
                kind: 'substitution',
                targetIndex: i - 1,
                heardIndex: j - 1,
                similarity: similarity(t.loose, h.loose),
              },
        );
        i--;
        j--;
        continue;
      }
    }
    if (i > 0 && nearlyEqual(here, cost[i - 1]![j]! + COST.delete)) {
      ops.push({ kind: 'missed', targetIndex: i - 1 });
      i--;
    } else {
      ops.push({ kind: 'extra', heardIndex: j - 1 });
      j--;
    }
  }
  return ops.reverse();
}

function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-9;
}
