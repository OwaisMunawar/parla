import { cefrAt, cefrIndex, type CefrLevel } from '@/core/content/languages';

import { type Scenario, type ScriptedRule } from '../content/types';
import { type Correction, type TutorReply } from './tutorContract';

/**
 * The scripted tutor's brain, as pure functions. It follows the scenario
 * script whatever the learner says and spots mistakes with patterns written
 * for that step, which is enough to demo and test the whole loop
 * (speak → correct → review) without a model, a key or a network.
 */
export function findCorrections(text: string, rules: readonly ScriptedRule[]): Correction[] {
  const seen = new Set<string>();
  const corrections: Correction[] = [];
  for (const rule of rules) {
    const pattern = wholeWords(rule.pattern);
    const match = pattern.exec(text);
    if (!match) continue;
    const original = match[0];
    const key = original.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    corrections.push({
      original,
      corrected: original.replace(pattern, rule.corrected),
      explanation: rule.explanation,
      type: rule.type,
    });
  }
  return corrections;
}

/**
 * Patterns match whole words. `\b` cannot do this in JavaScript: it only knows
 * ASCII letters, so "café" has no boundary after its "é". Unicode-aware
 * lookarounds give the same meaning for every language we teach.
 */
export function wholeWords(pattern: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${pattern})(?![\\p{L}\\p{N}])`, 'iu');
}

/**
 * A rough level read from one utterance: long and clean nudges up, several
 * mistakes nudges down. The server tutor replaces this with the model's own
 * estimate; the shape of the signal stays the same.
 */
export function estimateLevel(text: string, corrections: number, current: CefrLevel): CefrLevel {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (corrections >= 2) return cefrAt(cefrIndex(current) - 1);
  if (corrections === 0 && words >= 10) return cefrAt(cefrIndex(current) + 1);
  return current;
}

export function scriptedReply(input: {
  scenario: Scenario;
  /** How many learner turns came before this one. */
  turnIndex: number;
  learnerText: string;
  level: CefrLevel;
  languageRules: readonly ScriptedRule[];
}): TutorReply {
  const { scenario, turnIndex, learnerText, level, languageRules } = input;
  const step = scenario.steps[Math.min(turnIndex, scenario.steps.length - 1)];
  const corrections = findCorrections(learnerText, [...(step?.rules ?? []), ...languageRules]);
  const next = scenario.steps[turnIndex + 1];

  return {
    reply: next ? next.tutor : scenario.closing.tutor,
    translation: next ? next.translation : scenario.closing.translation,
    corrections,
    newVocabulary: step?.vocabulary ?? [],
    cefrEstimate: estimateLevel(learnerText, corrections.length, level),
    done: next === undefined,
  };
}

/** Splits a learner line around corrections, for the inline strike-and-fix rendering. */
export type MarkedSegment = { text: string; correction: Correction | null };

export function markCorrections(text: string, corrections: readonly Correction[]): MarkedSegment[] {
  const spans: { start: number; end: number; correction: Correction }[] = [];
  const lower = text.toLocaleLowerCase();
  for (const correction of corrections) {
    const start = lower.indexOf(correction.original.toLocaleLowerCase());
    if (start < 0) continue;
    const end = start + correction.original.length;
    if (spans.some((span) => start < span.end && end > span.start)) continue;
    spans.push({ start, end, correction });
  }
  spans.sort((a, b) => a.start - b.start);

  const segments: MarkedSegment[] = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start > cursor)
      segments.push({ text: text.slice(cursor, span.start), correction: null });
    segments.push({ text: text.slice(span.start, span.end), correction: span.correction });
    cursor = span.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), correction: null });
  return segments;
}
