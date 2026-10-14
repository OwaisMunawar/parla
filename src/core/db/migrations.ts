export type Migration = {
  version: number;
  name: string;
  statements: readonly string[];
};

/**
 * Append-only. A shipped migration is never edited; fixes go in a new one.
 *
 * Instants are epoch milliseconds. Calendar days are `YYYY-MM-DD` keys in the
 * learner's zone at the time of the activity, stored rather than derived so a
 * flight to another time zone never rewrites yesterday's streak.
 */
export const migrations: readonly Migration[] = [
  {
    version: 1,
    name: 'profile, practice history, review cards and streak',
    statements: [
      `CREATE TABLE profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        language TEXT NOT NULL CHECK (language IN ('es', 'fr', 'it')),
        goal TEXT NOT NULL,
        cefr_level TEXT NOT NULL CHECK (cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
        level_points INTEGER NOT NULL DEFAULT 0,
        daily_goal_xp INTEGER NOT NULL CHECK (daily_goal_xp > 0),
        reminder_time TEXT,
        onboarded_at INTEGER,
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE activities (
        id TEXT PRIMARY KEY NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('conversation', 'drill', 'review', 'placement')),
        language TEXT NOT NULL,
        xp INTEGER NOT NULL CHECK (xp >= 0),
        day_key TEXT NOT NULL,
        ref_id TEXT,
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE conversations (
        id TEXT PRIMARY KEY NOT NULL,
        scenario_id TEXT NOT NULL,
        language TEXT NOT NULL,
        day_key TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        cefr_estimate TEXT
      )`,
      `CREATE TABLE messages (
        id TEXT PRIMARY KEY NOT NULL,
        conversation_id TEXT NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('tutor', 'learner')),
        text TEXT NOT NULL,
        translation TEXT,
        corrections TEXT NOT NULL DEFAULT '[]',
        created_at INTEGER NOT NULL,
        UNIQUE (conversation_id, position)
      )`,
      `CREATE TABLE review_cards (
        id TEXT PRIMARY KEY NOT NULL,
        language TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('phrase', 'vocabulary')),
        prompt TEXT NOT NULL,
        answer TEXT NOT NULL,
        note TEXT,
        source_message_id TEXT,
        due INTEGER NOT NULL,
        stability REAL NOT NULL,
        difficulty REAL NOT NULL,
        scheduled_days INTEGER NOT NULL,
        learning_steps INTEGER NOT NULL,
        reps INTEGER NOT NULL,
        lapses INTEGER NOT NULL,
        state INTEGER NOT NULL CHECK (state BETWEEN 0 AND 3),
        last_review INTEGER,
        created_at INTEGER NOT NULL,
        UNIQUE (language, answer)
      )`,
      `CREATE TABLE review_logs (
        id TEXT PRIMARY KEY NOT NULL,
        card_id TEXT NOT NULL REFERENCES review_cards (id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 4),
        scheduled_days INTEGER NOT NULL,
        reviewed_at INTEGER NOT NULL
      )`,
      `CREATE TABLE vocabulary (
        language TEXT NOT NULL,
        term TEXT NOT NULL,
        meaning TEXT NOT NULL,
        learned_at INTEGER NOT NULL,
        PRIMARY KEY (language, term)
      )`,
      `CREATE TABLE streak (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        state TEXT NOT NULL
      )`,
      `CREATE TABLE entitlement (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        state TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
    ],
  },
  {
    version: 2,
    name: 'indexes for the review queue, daily quota and weekly chart',
    statements: [
      'CREATE INDEX review_cards_due ON review_cards (language, due)',
      'CREATE INDEX activities_day ON activities (day_key, kind)',
      'CREATE INDEX conversations_day ON conversations (day_key)',
      'CREATE INDEX messages_conversation ON messages (conversation_id, position)',
    ],
  },
];
