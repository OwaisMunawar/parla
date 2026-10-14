import { isCefrLevel, isLanguage, type CefrLevel, type Language } from '@/core/content/languages';
import { type SqlExecutor } from '@/core/db/SqlDriver';

export const GOALS = ['travel', 'work', 'conversation', 'culture'] as const;
export type LearningGoal = (typeof GOALS)[number];

export const DAILY_GOALS = [20, 40, 60] as const;

export type Profile = {
  language: Language;
  goal: LearningGoal;
  level: CefrLevel;
  levelPoints: number;
  dailyGoalXp: number;
  /** "HH:mm" local time, or null when reminders are off. */
  reminderTime: string | null;
  onboardedAt: number | null;
};

type ProfileRow = {
  language: string;
  goal: string;
  cefr_level: string;
  level_points: number;
  daily_goal_xp: number;
  reminder_time: string | null;
  onboarded_at: number | null;
};

export function createProfileRepository(db: SqlExecutor) {
  return {
    async get(): Promise<Profile | null> {
      const [row] = await db.query<ProfileRow>('SELECT * FROM profile WHERE id = 1');
      if (!row || !isLanguage(row.language) || !isCefrLevel(row.cefr_level)) return null;
      return {
        language: row.language,
        goal: (GOALS as readonly string[]).includes(row.goal)
          ? (row.goal as LearningGoal)
          : 'conversation',
        level: row.cefr_level,
        levelPoints: row.level_points,
        dailyGoalXp: row.daily_goal_xp,
        reminderTime: row.reminder_time,
        onboardedAt: row.onboarded_at,
      };
    },

    async save(profile: Profile, now: number): Promise<void> {
      await db.run(
        `INSERT INTO profile (id, language, goal, cefr_level, level_points, daily_goal_xp, reminder_time, onboarded_at, created_at)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           language = excluded.language, goal = excluded.goal, cefr_level = excluded.cefr_level,
           level_points = excluded.level_points, daily_goal_xp = excluded.daily_goal_xp,
           reminder_time = excluded.reminder_time, onboarded_at = excluded.onboarded_at`,
        [
          profile.language,
          profile.goal,
          profile.level,
          profile.levelPoints,
          profile.dailyGoalXp,
          profile.reminderTime,
          profile.onboardedAt,
          now,
        ],
      );
    },

    async update(patch: Partial<Profile>, now: number): Promise<Profile | null> {
      const current = await this.get();
      if (!current) return null;
      const next = { ...current, ...patch };
      await this.save(next, now);
      return next;
    },
  };
}

export type ProfileRepository = ReturnType<typeof createProfileRepository>;

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseReminderTime(value: string | null): { hour: number; minute: number } | null {
  const match = value ? TIME.exec(value) : null;
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export function formatReminderTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
