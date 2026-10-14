import { z } from 'zod';

// Relative on purpose: server/ imports this file and has no path aliases.
import { CEFR_LEVELS, LANGUAGES } from '../../../core/content/languages';

/**
 * The tutor turn, shared by the app and server/. The server asks the model
 * for exactly this shape, and the app validates it again on arrival: neither
 * side trusts the other, and a model that drifts from the schema fails loudly
 * in one place instead of rendering half a correction.
 */
export const correctionTypes = [
  'grammar',
  'vocabulary',
  'word-order',
  'gender',
  'conjugation',
  'pronunciation',
] as const;

export const correctionSchema = z.object({
  original: z
    .string()
    .min(1)
    .max(200)
    .describe('The exact fragment the learner said, copied verbatim.'),
  corrected: z.string().min(1).max(200).describe('The fragment as a native speaker would say it.'),
  explanation: z
    .string()
    .min(1)
    .max(280)
    .describe('One or two short sentences in English explaining the rule.'),
  type: z.enum(correctionTypes),
});

export const vocabularySchema = z.object({
  term: z.string().min(1).max(80).describe('A word or short phrase in the target language.'),
  meaning: z.string().min(1).max(120).describe('Its English meaning.'),
});

export const tutorReplySchema = z.object({
  reply: z
    .string()
    .min(1)
    .max(600)
    .describe('The tutor line in the target language, at or slightly above the learner level.'),
  translation: z.string().max(600).describe('English translation of reply.'),
  corrections: z.array(correctionSchema).max(4),
  newVocabulary: z.array(vocabularySchema).max(4),
  cefrEstimate: z.enum(CEFR_LEVELS).describe("Estimate of the learner's level from this turn."),
  done: z.boolean().describe('True when the scenario goal has been reached.'),
});

export const historyItemSchema = z.object({
  role: z.enum(['tutor', 'learner']),
  text: z.string().min(1).max(600),
});

export const tutorTurnRequestSchema = z.object({
  language: z.enum(LANGUAGES),
  level: z.enum(CEFR_LEVELS),
  scenario: z.object({
    id: z.string().min(1).max(60),
    title: z.string().min(1).max(80),
    goal: z.string().min(1).max(280),
    tutorRole: z.string().min(1).max(120),
  }),
  history: z.array(historyItemSchema).max(40),
  learnerText: z.string().min(1).max(600),
});

export type Correction = z.infer<typeof correctionSchema>;
export type CorrectionType = Correction['type'];
export type VocabularyItem = z.infer<typeof vocabularySchema>;
export type TutorReply = z.infer<typeof tutorReplySchema>;
export type TutorTurnRequest = z.infer<typeof tutorTurnRequestSchema>;
export type HistoryItem = z.infer<typeof historyItemSchema>;

/** A partial reply while it streams: the text grows, the lists arrive last. */
export type PartialTutorReply = Partial<Pick<TutorReply, 'reply' | 'translation'>>;
