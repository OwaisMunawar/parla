import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card,
  type Grade as FsrsGrade,
} from 'ts-fsrs';

/**
 * A thin, storage-shaped wrapper over ts-fsrs.
 *
 * The rest of the app never sees a ts-fsrs `Card`: schedules are plain numbers
 * (epoch ms, no Date objects) so they round-trip through SQLite unchanged, and
 * grades are words so screens never import the library's enums. If FSRS is
 * ever swapped or re-parameterised, this file is the whole blast radius.
 */
export type Grade = 'again' | 'hard' | 'good' | 'easy';
export const GRADES: readonly Grade[] = ['again', 'hard', 'good', 'easy'];

export type CardState = 'new' | 'learning' | 'review' | 'relearning';

export type CardSchedule = {
  due: number;
  stability: number;
  difficulty: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: 0 | 1 | 2 | 3;
  lastReview: number | null;
};

export type SchedulerOptions = {
  /** Probability of recall the intervals aim for. 0.9 is the FSRS default. */
  requestRetention?: number;
  maximumIntervalDays?: number;
  /** Spreads due dates so cards added together do not stay in lockstep. Off in tests. */
  fuzz?: boolean;
};

const gradeToRating: Record<Grade, FsrsGrade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

const stateNames: Record<CardSchedule['state'], CardState> = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'relearning',
};

function toCard(schedule: CardSchedule): Card {
  return {
    due: new Date(schedule.due),
    stability: schedule.stability,
    difficulty: schedule.difficulty,
    elapsed_days: 0,
    scheduled_days: schedule.scheduledDays,
    learning_steps: schedule.learningSteps,
    reps: schedule.reps,
    lapses: schedule.lapses,
    state: schedule.state,
    last_review: schedule.lastReview === null ? undefined : new Date(schedule.lastReview),
  };
}

function fromCard(card: Card): CardSchedule {
  return {
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as CardSchedule['state'],
    lastReview: card.last_review ? card.last_review.getTime() : null,
  };
}

export type Scheduler = ReturnType<typeof createScheduler>;

export function createScheduler(options: SchedulerOptions = {}) {
  const engine = fsrs(
    generatorParameters({
      request_retention: options.requestRetention ?? 0.9,
      maximum_interval: options.maximumIntervalDays ?? 365,
      enable_fuzz: options.fuzz ?? false,
      enable_short_term: true,
    }),
  );

  return {
    newSchedule(now: Date): CardSchedule {
      return fromCard(createEmptyCard(now));
    },

    review(schedule: CardSchedule, grade: Grade, now: Date): CardSchedule {
      return fromCard(engine.next(toCard(schedule), now, gradeToRating[grade]).card);
    },

    /** What each button would do, for the interval labels under them. */
    preview(schedule: CardSchedule, now: Date): Record<Grade, CardSchedule> {
      const outcomes = engine.repeat(toCard(schedule), now);
      return {
        again: fromCard(outcomes[Rating.Again].card),
        hard: fromCard(outcomes[Rating.Hard].card),
        good: fromCard(outcomes[Rating.Good].card),
        easy: fromCard(outcomes[Rating.Easy].card),
      };
    },

    /** Probability of recall right now, 0..1. New cards have none to report. */
    retrievability(schedule: CardSchedule, now: Date): number | null {
      if (schedule.state === State.New) return null;
      return engine.get_retrievability(toCard(schedule), now, false);
    },
  };
}

export function stateOf(schedule: CardSchedule): CardState {
  return stateNames[schedule.state];
}

export function isDue(schedule: CardSchedule, now: Date): boolean {
  return schedule.due <= now.getTime();
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "<1m", "10m", "5h", "3d", "2mo", "1.5y": compact enough for a grade button. */
export function formatInterval(ms: number): string {
  if (ms < MINUTE) return '<1m';
  if (ms < HOUR) return `${Math.round(ms / MINUTE)}m`;
  if (ms < DAY) return `${Math.round(ms / HOUR)}h`;
  const days = ms / DAY;
  if (days < 30) return `${Math.round(days)}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  const years = Math.round((days / 365) * 10) / 10;
  return `${years}y`;
}
