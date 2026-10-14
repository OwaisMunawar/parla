import { AppError, toAppError } from '@/core/errors/AppError';

import { tutorTurnRequestSchema } from '../lib/tutorContract';
import { createEventDecoder, settle, type StreamOutcome } from '../lib/turnStream';
import { type Tutor } from './Tutor';

/** The subset of fetch the tutor needs. The app passes expo/fetch, which streams bodies. */
export type StreamingFetch = (
  url: string,
  init: { method: 'POST'; headers: Record<string, string>; body: string; signal?: AbortSignal },
) => Promise<{
  ok: boolean;
  status: number;
  body: ReadableStream<Uint8Array> | null;
  text(): Promise<string>;
}>;

/**
 * Talks to server/. The model key never leaves the server; the app only knows
 * a base URL. The reply streams as NDJSON so the tutor's line starts appearing
 * while the corrections are still being generated.
 */
export function createServerTutor(options: { baseUrl: string; fetch: StreamingFetch }): Tutor {
  const endpoint = `${options.baseUrl.replace(/\/+$/, '')}/v1/turn`;

  return {
    kind: 'server',
    async reply(request, { signal, onPartial } = {}) {
      const { turnIndex: _turnIndex, ...turn } = request;
      const body = JSON.stringify(tutorTurnRequestSchema.parse(turn));

      let response: Awaited<ReturnType<StreamingFetch>>;
      try {
        response = await options.fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/x-ndjson' },
          body,
          signal,
        });
      } catch (error) {
        if (signal?.aborted) throw new AppError('CANCELLED', 'Tutor turn cancelled');
        throw toAppError(error, 'TUTOR_UNAVAILABLE', 'The tutor server could not be reached.');
      }
      if (!response.ok) {
        throw new AppError('TUTOR_FAILED', `The tutor server answered ${response.status}.`);
      }

      const outcome = await readOutcome(response, onPartial);
      if (outcome === null) {
        throw new AppError('TUTOR_INVALID_OUTPUT', 'The tutor stream ended without a reply.');
      }
      if (!outcome.ok) throw new AppError('TUTOR_FAILED', outcome.message);
      return outcome.turn;
    },
  };
}

async function readOutcome(
  response: Awaited<ReturnType<StreamingFetch>>,
  onPartial: Parameters<typeof settle>[1],
): Promise<StreamOutcome | null> {
  const decoder = createEventDecoder();
  if (!response.body) {
    return settle([...decoder.push(await response.text()), ...decoder.end()], onPartial);
  }
  const reader = response.body.getReader();
  const text = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const outcome = settle(decoder.push(text.decode(value, { stream: true })), onPartial);
    if (outcome) {
      await reader.cancel().catch(() => undefined);
      return outcome;
    }
  }
  return settle([...decoder.push(text.decode()), ...decoder.end()], onPartial);
}
