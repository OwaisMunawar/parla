import { type Clock } from '@/core/clock/Clock';
import { type CefrLevel } from '@/core/content/languages';
import { addDays, dayKey, type DayKey } from '@/core/lib/localDate';

import { type ProfileRepository } from '../../onboarding/data/profileRepository';
import { type ProgressRepository } from '../data/progressRepository';
import {
  recordPractice as recordStreakDay,
  reconcile,
  viewStreak,
  type StreakView,
} from '../lib/streak';
import {
  addLevelPoints,
  goalProgress,
  levelProgress,
  weeklyXp,
  type ActivityKind,
  type DailyXp,
  type LevelProgress,
} from '../lib/xp';

export type ProgressSnapshot = {
  today: DayKey;
  streak: StreakView;
  longestStreak: number;
  todayXp: number;
  dailyGoalXp: number;
  goalFraction: number;
  week: DailyXp[];
  totalXp: number;
  wordsLearned: number;
  level: LevelProgress;
};

export type PracticeOutcome = {
  xp: number;
  streak: StreakView;
  /** True the moment today's goal is crossed, for the celebration. */
  goalJustReached: boolean;
  levelUp: CefrLevel | null;
};

/**
 * The one write path for "the learner practised": XP, streak and level all
 * move together, so the home screen, the widget and the progress tab can
 * never disagree about what today looked like.
 */
export function createProgressService(deps: {
  progress: ProgressRepository;
  profiles: ProfileRepository;
  clock: Clock;
}) {
  const { progress, profiles, clock } = deps;
  const today = () => dayKey(clock.now(), clock.timeZone());

  const todayXp = async (day: DayKey) =>
    (await progress.xpByDay(day)).find((d) => d.day === day)?.xp ?? 0;

  return {
    today,

    async record(input: {
      kind: ActivityKind;
      xp: number;
      language: string;
      refId?: string | null;
      tutorEstimate?: CefrLevel | null;
    }): Promise<PracticeOutcome> {
      const day = today();
      const at = clock.now().getTime();
      const profile = await profiles.get();
      const before = await todayXp(day);

      await progress.addActivity({ ...input, day, at });
      const streak = recordStreakDay(await progress.streak(), day);
      await progress.saveStreak(streak);

      let levelUp: CefrLevel | null = null;
      if (profile) {
        const next = addLevelPoints(
          profile.level,
          profile.levelPoints,
          input.xp,
          input.tutorEstimate ?? null,
        );
        if (next.level !== profile.level) levelUp = next.level;
        await profiles.update({ level: next.level, levelPoints: next.points }, at);
      }

      const goal = profile?.dailyGoalXp ?? 40;
      return {
        xp: input.xp,
        streak: viewStreak(streak, day),
        goalJustReached: before < goal && before + input.xp >= goal,
        levelUp,
      };
    },

    /** Settles freezes for missed days. Run on launch and on foreground. */
    async reconcile(): Promise<void> {
      const current = await progress.streak();
      const settled = reconcile(current, today());
      if (settled !== current) await progress.saveStreak(settled);
    },

    async snapshot(): Promise<ProgressSnapshot> {
      const day = today();
      const profile = await profiles.get();
      const rows = await progress.xpByDay(addDays(day, -6));
      const streak = await progress.streak();
      const xpToday = rows.find((d) => d.day === day)?.xp ?? 0;
      const goal = profile?.dailyGoalXp ?? 40;
      return {
        today: day,
        streak: viewStreak(streak, day),
        longestStreak: streak.longest,
        todayXp: xpToday,
        dailyGoalXp: goal,
        goalFraction: goalProgress(xpToday, goal),
        week: weeklyXp(rows, day),
        totalXp: await progress.totalXp(),
        wordsLearned: profile ? await progress.wordsLearned(profile.language) : 0,
        level: levelProgress(profile?.level ?? 'A1', profile?.levelPoints ?? 0),
      };
    },
  };
}

export type ProgressService = ReturnType<typeof createProgressService>;
