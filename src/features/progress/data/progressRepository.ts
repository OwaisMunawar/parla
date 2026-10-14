import { type SqlExecutor } from '@/core/db/SqlDriver';
import { type IdGenerator } from '@/core/lib/id';
import { type DayKey } from '@/core/lib/localDate';

import { parseStreak, type StreakState } from '../lib/streak';
import { type ActivityKind, type DailyXp } from '../lib/xp';

export type ActivityInput = {
  kind: ActivityKind;
  language: string;
  xp: number;
  day: DayKey;
  refId?: string | null;
  at: number;
};

export function createProgressRepository(db: SqlExecutor, ids: IdGenerator) {
  return {
    async addActivity(input: ActivityInput): Promise<void> {
      await db.run(
        'INSERT INTO activities (id, kind, language, xp, day_key, ref_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          ids('act'),
          input.kind,
          input.language,
          Math.max(0, Math.round(input.xp)),
          input.day,
          input.refId ?? null,
          input.at,
        ],
      );
    },

    async xpByDay(since: DayKey): Promise<DailyXp[]> {
      const rows = await db.query<{ day_key: string; xp: number }>(
        'SELECT day_key, SUM(xp) AS xp FROM activities WHERE day_key >= ? GROUP BY day_key ORDER BY day_key',
        [since],
      );
      return rows.map((row) => ({ day: row.day_key, xp: row.xp }));
    },

    async totalXp(): Promise<number> {
      const [row] = await db.query<{ total: number | null }>(
        'SELECT SUM(xp) AS total FROM activities',
      );
      return row?.total ?? 0;
    },

    async streak(): Promise<StreakState> {
      const [row] = await db.query<{ state: string }>('SELECT state FROM streak WHERE id = 1');
      return parseStreak(row?.state);
    },

    async saveStreak(state: StreakState): Promise<void> {
      await db.run(
        'INSERT INTO streak (id, state) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET state = excluded.state',
        [JSON.stringify(state)],
      );
    },

    /** Returns how many of the terms were new to the learner. */
    async addVocabulary(
      language: string,
      items: readonly { term: string; meaning: string }[],
      at: number,
    ): Promise<number> {
      let added = 0;
      for (const item of items) {
        const result = await db.run(
          'INSERT OR IGNORE INTO vocabulary (language, term, meaning, learned_at) VALUES (?, ?, ?, ?)',
          [language, item.term.trim().toLocaleLowerCase(), item.meaning, at],
        );
        added += result.rowsAffected;
      }
      return added;
    },

    async wordsLearned(language: string): Promise<number> {
      const [row] = await db.query<{ n: number }>(
        'SELECT COUNT(*) AS n FROM vocabulary WHERE language = ?',
        [language],
      );
      return row?.n ?? 0;
    },
  };
}

export type ProgressRepository = ReturnType<typeof createProgressRepository>;
