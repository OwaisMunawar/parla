import { Output, streamText, type LanguageModel } from 'ai';

import {
  tutorReplySchema,
  type TutorReply,
  type TutorTurnRequest,
} from '../../src/features/conversation/lib/tutorContract';
import { type TurnEvent } from '../../src/features/conversation/lib/turnStream';

const languageNames = { es: 'Spanish', fr: 'French', it: 'Italian' } as const;

export function buildInstructions(request: TutorTurnRequest): string {
  const language = languageNames[request.language];
  return [
    `You are a ${language} speaking tutor playing a role in a short spoken scenario.`,
    `Role: ${request.scenario.tutorRole}.`,
    `Scenario: ${request.scenario.title}. The learner's goal: ${request.scenario.goal}`,
    `The learner is around CEFR ${request.level}. Speak at that level or one step above.`,
    'The learner speaks; their words reach you through speech recognition, so ignore missing',
    'punctuation and capitalisation, and never correct those.',
    'Each turn:',
    `- reply: stay in role, in ${language}, one or two short sentences, and end with a question`,
    '  that moves the scenario towards its goal. Never switch to English in reply.',
    '- translation: the reply in natural English.',
    '- corrections: real mistakes in the learner line only, at most three, most important first.',
    '  original must be copied verbatim from the learner line. explanation is in English, one',
    '  sentence, naming the rule. An empty list is a fine answer for a correct line.',
    `- newVocabulary: up to three ${language} words or phrases from your reply worth reviewing.`,
    "- cefrEstimate: your estimate of the learner's level from this line.",
    '- done: true once the goal is reached; then reply with a natural goodbye.',
  ].join('\n');
}

/**
 * Corrections whose `original` is not actually in what the learner said are
 * dropped: the app highlights them inline, and a hallucinated fragment would
 * point at nothing or at the wrong words.
 */
export function groundCorrections(turn: TutorReply, learnerText: string): TutorReply {
  const said = learnerText.toLocaleLowerCase();
  return {
    ...turn,
    corrections: turn.corrections.filter(
      (c) =>
        said.includes(c.original.toLocaleLowerCase()) &&
        c.original.toLocaleLowerCase() !== c.corrected.toLocaleLowerCase(),
    ),
  };
}

/**
 * Streams one tutor turn as events: partial reply text while the model writes
 * it, then the validated, grounded final turn. Model or validation failures
 * become an error event instead of a broken stream, so the app always gets a
 * well-formed ending.
 */
export async function* streamTurn(
  request: TutorTurnRequest,
  model: LanguageModel,
  signal?: AbortSignal,
): AsyncGenerator<TurnEvent> {
  try {
    const result = streamText({
      model,
      output: Output.object({ schema: tutorReplySchema, name: 'tutor_turn' }),
      instructions: buildInstructions(request),
      messages: [
        ...request.history.map((item) => ({
          role: item.role === 'tutor' ? ('assistant' as const) : ('user' as const),
          content: item.text,
        })),
        { role: 'user' as const, content: request.learnerText },
      ],
      temperature: 0.4,
      maxRetries: 1,
      abortSignal: signal,
      // Failures reach the catch below and become an error event; the SDK's
      // default handler would also log them to stderr.
      onError: () => undefined,
    });

    let lastReply = '';
    for await (const partial of result.partialOutputStream) {
      const reply = typeof partial.reply === 'string' ? partial.reply : '';
      if (reply.length > lastReply.length) {
        lastReply = reply;
        yield { type: 'partial', reply };
      }
    }

    const final = tutorReplySchema.parse(await result.output);
    yield { type: 'final', turn: groundCorrections(final, request.learnerText) };
  } catch (error) {
    yield {
      type: 'error',
      message: error instanceof Error ? error.message : 'The tutor model failed.',
    };
  }
}
