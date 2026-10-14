import { z } from 'zod';

import { tutorReplySchema, type PartialTutorReply, type TutorReply } from './tutorContract';

/**
 * Wire format of POST /v1/turn: newline-delimited JSON events. NDJSON rather
 * than SSE because it needs no parser beyond split-on-newline on either side,
 * and a proxy that buffers the stream still delivers a valid document.
 */
export const turnEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('partial'),
    reply: z.string().optional(),
    translation: z.string().optional(),
  }),
  z.object({ type: z.literal('final'), turn: tutorReplySchema }),
  z.object({ type: z.literal('error'), message: z.string() }),
]);

export type TurnEvent = z.infer<typeof turnEventSchema>;

export function encodeEvent(event: TurnEvent): string {
  return `${JSON.stringify(event)}\n`;
}

/**
 * Incremental NDJSON decoder: feed it chunks as they arrive, get complete
 * events back. Chunk boundaries can fall anywhere, including inside a UTF-8
 * sequence, which TextDecoder's stream mode handles before we see the text.
 */
export function createEventDecoder() {
  let buffer = '';
  return {
    push(text: string): TurnEvent[] {
      buffer += text;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      return lines.flatMap(parseLine);
    },
    end(): TurnEvent[] {
      const rest = buffer;
      buffer = '';
      return parseLine(rest);
    },
  };
}

function parseLine(line: string): TurnEvent[] {
  const trimmed = line.trim();
  if (!trimmed) return [];
  let json: unknown;
  try {
    json = JSON.parse(trimmed);
  } catch {
    return [];
  }
  const parsed = turnEventSchema.safeParse(json);
  return parsed.success ? [parsed.data] : [];
}

export type StreamOutcome = { ok: true; turn: TutorReply } | { ok: false; message: string };

/** Folds events into partial callbacks and a final outcome. */
export function settle(
  events: readonly TurnEvent[],
  onPartial?: (partial: PartialTutorReply) => void,
): StreamOutcome | null {
  for (const event of events) {
    if (event.type === 'partial')
      onPartial?.({ reply: event.reply, translation: event.translation });
    if (event.type === 'final') return { ok: true, turn: event.turn };
    if (event.type === 'error') return { ok: false, message: event.message };
  }
  return null;
}
