import { cefrAt, cefrIndex, CEFR_LEVELS, type CefrLevel } from '@/core/content/languages';
import { lastNDays, type DayKey } from '@/core/lib/localDate';

export type ActivityKind = 'conversation' | 'drill' | 'review' | 'placement';

/**
 * XP rewards speaking over tapping. A conversation turn is worth more than a
 * review card because producing a sentence is the skill the app exists for.
 */
export const XP = {
  conversationTurn: 5,
  conversationComplete: 10,
  reviewCard: 2,
  placement: 20,
  /** Drills scale with the score: a 90% attempt earns 9. */
  drill: (overall: number) => Math.max(1, Math.round(overall / 10)),
} as const;

export type DailyXp = { day: DayKey; xp: number };

/** The last seven days ending today, zero-filled, oldest first. */
export function weeklyXp(rows: readonly DailyXp[], today: DayKey): DailyXp[] {
  const totals = new Map<DayKey, number>();
  for (const row of rows) totals.set(row.day, (totals.get(row.day) ?? 0) + row.xp);
  return lastNDays(today, 7).map((day) => ({ day, xp: totals.get(day) ?? 0 }));
}

export function goalProgress(todayXp: number, dailyGoal: number): number {
  if (dailyGoal <= 0) return 1;
  return Math.min(1, Math.max(0, todayXp / dailyGoal));
}

/** Days in the last week that met the goal, for the "5 of 7" caption. */
export function daysOnGoal(week: readonly DailyXp[], dailyGoal: number): number {
  return week.filter((d) => d.xp >= dailyGoal).length;
}

/**
 * Level points move a learner through CEFR bands between placements. Points
 * come from speaking XP; the tutor's own level estimate can move someone up a
 * band early, never down, so a hard scenario never feels like a demotion.
 */
export const POINTS_PER_LEVEL = 600;

export type LevelProgress = {
  level: CefrLevel;
  next: CefrLevel | null;
  fraction: number;
};

export function levelProgress(level: CefrLevel, points: number): LevelProgress {
  const index = cefrIndex(level);
  const next = index < CEFR_LEVELS.length - 1 ? cefrAt(index + 1) : null;
  return {
    level,
    next,
    fraction: next === null ? 1 : Math.min(1, Math.max(0, points / POINTS_PER_LEVEL)),
  };
}

export function addLevelPoints(
  level: CefrLevel,
  points: number,
  earned: number,
  tutorEstimate: CefrLevel | null = null,
): { level: CefrLevel; points: number } {
  let currentLevel = level;
  let total = points + Math.max(0, earned);

  while (total >= POINTS_PER_LEVEL && cefrIndex(currentLevel) < CEFR_LEVELS.length - 1) {
    total -= POINTS_PER_LEVEL;
    currentLevel = cefrAt(cefrIndex(currentLevel) + 1);
  }
  if (tutorEstimate !== null && cefrIndex(tutorEstimate) > cefrIndex(currentLevel)) {
    return { level: cefrAt(cefrIndex(currentLevel) + 1), points: 0 };
  }
  return { level: currentLevel, points: cefrIndex(currentLevel) === 5 ? 0 : total };
}
