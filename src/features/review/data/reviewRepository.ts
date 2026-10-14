import { type SqlExecutor } from '@/core/db/SqlDriver';
import { type IdGenerator } from '@/core/lib/id';

import { type CardSchedule, type Grade } from '../lib/scheduler';

export type CardKind = 'phrase' | 'vocabulary';

export type ReviewCard = {
  id: string;
  language: string;
  kind: CardKind;
  /** English meaning or a cue, shown first. */
  prompt: string;
  /** Target-language phrase the learner says. */
  answer: string;
  /** Why it is worth reviewing, e.g. the explanation of the original mistake. */
  note: string | null;
  sourceMessageId: string | null;
  createdAt: number;
  schedule: CardSchedule;
};

type CardRow = {
  id: string;
  language: string;
  kind: CardKind;
  prompt: string;
  answer: string;
  note: string | null;
  source_message_id: string | null;
  created_at: number;
  due: number;
  stability: number;
  difficulty: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: number | null;
};

const gradeValue: Record<Grade, number> = { again: 1, hard: 2, good: 3, easy: 4 };

function toCard(row: CardRow): ReviewCard {
  return {
    id: row.id,
    language: row.language,
    kind: row.kind,
    prompt: row.prompt,
    answer: row.answer,
    note: row.note,
    sourceMessageId: row.source_message_id,
    createdAt: row.created_at,
    schedule: {
      due: row.due,
      stability: row.stability,
      difficulty: row.difficulty,
      scheduledDays: row.scheduled_days,
      learningSteps: row.learning_steps,
      reps: row.reps,
      lapses: row.lapses,
      state: Math.min(3, Math.max(0, row.state)) as CardSchedule['state'],
      lastReview: row.last_review,
    },
  };
}

export function createReviewRepository(db: SqlExecutor, ids: IdGenerator) {
  return {
    /**
     * Adds a card unless the learner already has one with the same answer:
     * making the same mistake twice should not double the review load.
     */
    async add(card: Omit<ReviewCard, 'id'>): Promise<{ added: boolean; id: string }> {
      const [existing] = await db.query<{ id: string }>(
        'SELECT id FROM review_cards WHERE language = ? AND answer = ?',
        [card.language, card.answer],
      );
      if (existing) return { added: false, id: existing.id };
      const id = ids('card');
      const s = card.schedule;
      await db.run(
        `INSERT INTO review_cards (id, language, kind, prompt, answer, note, source_message_id, due, stability,
           difficulty, scheduled_days, learning_steps, reps, lapses, state, last_review, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          card.language,
          card.kind,
          card.prompt,
          card.answer,
          card.note,
          card.sourceMessageId,
          s.due,
          s.stability,
          s.difficulty,
          s.scheduledDays,
          s.learningSteps,
          s.reps,
          s.lapses,
          s.state,
          s.lastReview,
          card.createdAt,
        ],
      );
      return { added: true, id };
    },

    async all(language: string): Promise<ReviewCard[]> {
      const rows = await db.query<CardRow>(
        'SELECT * FROM review_cards WHERE language = ? ORDER BY created_at',
        [language],
      );
      return rows.map(toCard);
    },

    async get(id: string): Promise<ReviewCard | null> {
      const [row] = await db.query<CardRow>('SELECT * FROM review_cards WHERE id = ?', [id]);
      return row ? toCard(row) : null;
    },

    async saveReview(id: string, grade: Grade, schedule: CardSchedule, at: number): Promise<void> {
      await db.run(
        `UPDATE review_cards SET due = ?, stability = ?, difficulty = ?, scheduled_days = ?, learning_steps = ?,
           reps = ?, lapses = ?, state = ?, last_review = ? WHERE id = ?`,
        [
          schedule.due,
          schedule.stability,
          schedule.difficulty,
          schedule.scheduledDays,
          schedule.learningSteps,
          schedule.reps,
          schedule.lapses,
          schedule.state,
          schedule.lastReview,
          id,
        ],
      );
      await db.run(
        'INSERT INTO review_logs (id, card_id, rating, scheduled_days, reviewed_at) VALUES (?, ?, ?, ?, ?)',
        [ids('log'), id, gradeValue[grade], schedule.scheduledDays, at],
      );
    },

    /** New cards introduced since `since`, for the daily new-card limit. */
    async newIntroducedSince(since: number): Promise<number> {
      const [row] = await db.query<{ n: number }>(
        `SELECT COUNT(DISTINCT l.card_id) AS n FROM review_logs l
         WHERE l.reviewed_at >= ? AND NOT EXISTS (
           SELECT 1 FROM review_logs earlier WHERE earlier.card_id = l.card_id AND earlier.reviewed_at < ?)`,
        [since, since],
      );
      return row?.n ?? 0;
    },
  };
}

export type ReviewRepository = ReturnType<typeof createReviewRepository>;
