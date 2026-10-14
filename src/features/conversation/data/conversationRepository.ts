import { type SqlExecutor } from '@/core/db/SqlDriver';
import { type IdGenerator } from '@/core/lib/id';
import { type DayKey } from '@/core/lib/localDate';

import { correctionSchema, type Correction } from '../lib/tutorContract';

export type ChatMessage = {
  id: string;
  role: 'tutor' | 'learner';
  text: string;
  translation: string | null;
  corrections: Correction[];
  createdAt: number;
};

export type ConversationSummary = {
  id: string;
  scenarioId: string;
  language: string;
  day: DayKey;
  startedAt: number;
  endedAt: number | null;
  turns: number;
};

type MessageRow = {
  id: string;
  role: 'tutor' | 'learner';
  text: string;
  translation: string | null;
  corrections: string;
  created_at: number;
};

function parseCorrections(json: string): Correction[] {
  try {
    const raw: unknown = JSON.parse(json);
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((item) => {
      const parsed = correctionSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return [];
  }
}

export function createConversationRepository(db: SqlExecutor, ids: IdGenerator) {
  return {
    /**
     * Created on the learner's first utterance, which is also when it starts
     * counting against the free quota (see billing/lib/quota.ts).
     */
    async start(input: {
      scenarioId: string;
      language: string;
      day: DayKey;
      at: number;
    }): Promise<string> {
      const id = ids('conv');
      await db.run(
        'INSERT INTO conversations (id, scenario_id, language, day_key, started_at) VALUES (?, ?, ?, ?, ?)',
        [id, input.scenarioId, input.language, input.day, input.at],
      );
      return id;
    },

    async addMessage(
      conversationId: string,
      message: Omit<ChatMessage, 'id'>,
    ): Promise<ChatMessage> {
      const id = ids('msg');
      const [row] = await db.query<{ next: number }>(
        'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM messages WHERE conversation_id = ?',
        [conversationId],
      );
      await db.run(
        `INSERT INTO messages (id, conversation_id, position, role, text, translation, corrections, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          conversationId,
          row?.next ?? 0,
          message.role,
          message.text,
          message.translation,
          JSON.stringify(message.corrections),
          message.createdAt,
        ],
      );
      return { ...message, id };
    },

    async finish(conversationId: string, at: number, cefrEstimate: string | null): Promise<void> {
      await db.run('UPDATE conversations SET ended_at = ?, cefr_estimate = ? WHERE id = ?', [
        at,
        cefrEstimate,
        conversationId,
      ]);
    },

    async messages(conversationId: string): Promise<ChatMessage[]> {
      const rows = await db.query<MessageRow>(
        'SELECT id, role, text, translation, corrections, created_at FROM messages WHERE conversation_id = ? ORDER BY position',
        [conversationId],
      );
      return rows.map((row) => ({
        id: row.id,
        role: row.role,
        text: row.text,
        translation: row.translation,
        corrections: parseCorrections(row.corrections),
        createdAt: row.created_at,
      }));
    },

    async startedOn(day: DayKey): Promise<number> {
      const [row] = await db.query<{ n: number }>(
        'SELECT COUNT(*) AS n FROM conversations WHERE day_key = ?',
        [day],
      );
      return row?.n ?? 0;
    },

    async recent(limit = 10): Promise<ConversationSummary[]> {
      const rows = await db.query<{
        id: string;
        scenario_id: string;
        language: string;
        day_key: string;
        started_at: number;
        ended_at: number | null;
        turns: number;
      }>(
        `SELECT c.id, c.scenario_id, c.language, c.day_key, c.started_at, c.ended_at,
                (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.role = 'learner') AS turns
         FROM conversations c ORDER BY c.started_at DESC LIMIT ?`,
        [limit],
      );
      return rows.map((row) => ({
        id: row.id,
        scenarioId: row.scenario_id,
        language: row.language,
        day: row.day_key,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        turns: row.turns,
      }));
    },
  };
}

export type ConversationRepository = ReturnType<typeof createConversationRepository>;
