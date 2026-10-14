/**
 * Time is an injected dependency. Streaks, quotas, trials and review due dates
 * all hinge on "now" and on the learner's time zone, and every one of those
 * rules is tested by moving a fake clock across midnight, DST and expiry.
 */
export interface Clock {
  now(): Date;
  /** IANA zone the learner's calendar day is measured in, e.g. "Europe/Madrid". */
  timeZone(): string;
}

export function createSystemClock(): Clock {
  return {
    now: () => new Date(),
    timeZone: () => Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
  };
}

export type ManualClock = Clock & {
  set(instant: Date | string): void;
  advance(ms: number): void;
  setTimeZone(zone: string): void;
};

export function createManualClock(start: Date | string, zone = 'UTC'): ManualClock {
  let current = new Date(start);
  let tz = zone;
  return {
    now: () => new Date(current),
    timeZone: () => tz,
    set: (instant) => {
      current = new Date(instant);
    },
    advance: (ms) => {
      current = new Date(current.getTime() + ms);
    },
    setTimeZone: (next) => {
      tz = next;
    },
  };
}
