import { addDays, daysBetween, type DayKey } from '@/core/lib/localDate';

/**
 * Streaks with freeze tokens, as a pure state machine over calendar day keys.
 *
 * Rules:
 * - Practising on a new calendar day extends the streak by one.
 * - Every 7th day of a streak earns a freeze, up to MAX_FREEZES in the bank.
 * - Missed days are covered by freezes, oldest first, if there are enough
 *   to cover the whole gap. A gap the bank cannot cover breaks the streak and
 *   leaves the bank alone: burning tokens on a lost streak would be punitive.
 *
 * Day keys come from the learner's zone at the time of each activity
 * (see core/lib/localDate), so DST and travel never add or remove a day.
 */
export type StreakState = {
  current: number;
  longest: number;
  lastActiveDay: DayKey | null;
  /** Last day that counts towards the streak, practised or frozen. */
  coveredThrough: DayKey | null;
  freezes: number;
  frozenDays: DayKey[];
};

export const MAX_FREEZES = 2;
export const FREEZE_EVERY = 7;
/** Enough history for the calendar strip; older frozen days are only a count. */
const FROZEN_HISTORY = 30;

export const emptyStreak: StreakState = {
  current: 0,
  longest: 0,
  lastActiveDay: null,
  coveredThrough: null,
  freezes: 0,
  frozenDays: [],
};

/**
 * Settles missed days before `today`. Idempotent, so it is safe to run on
 * every app open as well as before recording an activity.
 */
export function reconcile(state: StreakState, today: DayKey): StreakState {
  if (state.coveredThrough === null || state.current === 0) return state;
  const missed = daysBetween(state.coveredThrough, today) - 1;
  if (missed <= 0) return state;

  if (missed > state.freezes) {
    return { ...state, current: 0, coveredThrough: null };
  }

  const covered = Array.from({ length: missed }, (_, i) => addDays(state.coveredThrough!, i + 1));
  return {
    ...state,
    freezes: state.freezes - missed,
    coveredThrough: addDays(today, -1),
    frozenDays: [...state.frozenDays, ...covered].slice(-FROZEN_HISTORY),
  };
}

export function recordPractice(state: StreakState, today: DayKey): StreakState {
  const settled = reconcile(state, today);
  if (settled.lastActiveDay === today) return settled;
  // A clock set backwards (or a stale day key) must not rewind the streak.
  if (settled.lastActiveDay !== null && daysBetween(settled.lastActiveDay, today) < 0) {
    return settled;
  }

  const current = settled.current + 1;
  const earned = current % FREEZE_EVERY === 0 && settled.freezes < MAX_FREEZES ? 1 : 0;
  return {
    ...settled,
    current,
    longest: Math.max(settled.longest, current),
    lastActiveDay: today,
    coveredThrough: today,
    freezes: settled.freezes + earned,
  };
}

export type StreakView = {
  /** What the flame shows. A streak broken by a gap reads 0 before it is reconciled. */
  days: number;
  practisedToday: boolean;
  /** Streak alive but nothing done today: the reminder and the widget nudge. */
  atRisk: boolean;
  freezes: number;
  /** Whether a gap tonight would be covered by a freeze. */
  protectedTonight: boolean;
};

export function viewStreak(state: StreakState, today: DayKey): StreakView {
  const settled = reconcile(state, today);
  const practisedToday = settled.lastActiveDay === today;
  return {
    days: settled.current,
    practisedToday,
    atRisk: settled.current > 0 && !practisedToday,
    freezes: settled.freezes,
    protectedTonight: settled.freezes > 0,
  };
}

/** Exactly what persists. Parsing is defensive because the row outlives app versions. */
export function parseStreak(json: string | null | undefined): StreakState {
  if (!json) return emptyStreak;
  try {
    const raw = JSON.parse(json) as Partial<StreakState>;
    return {
      current: nonNegative(raw.current),
      longest: nonNegative(raw.longest),
      lastActiveDay: typeof raw.lastActiveDay === 'string' ? raw.lastActiveDay : null,
      coveredThrough: typeof raw.coveredThrough === 'string' ? raw.coveredThrough : null,
      freezes: Math.min(MAX_FREEZES, nonNegative(raw.freezes)),
      frozenDays: Array.isArray(raw.frozenDays)
        ? raw.frozenDays.filter((d): d is string => typeof d === 'string')
        : [],
    };
  } catch {
    return emptyStreak;
  }
}

function nonNegative(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}
