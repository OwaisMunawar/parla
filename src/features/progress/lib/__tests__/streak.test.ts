import { createManualClock } from '@/core/clock/Clock';
import { addDays, dayKey } from '@/core/lib/localDate';

import {
  emptyStreak,
  MAX_FREEZES,
  parseStreak,
  reconcile,
  recordPractice,
  viewStreak,
  type StreakState,
} from '../streak';

function practiseDays(days: string[], from: StreakState = emptyStreak): StreakState {
  return days.reduce(recordPractice, from);
}

const run = (first: string, count: number) =>
  Array.from({ length: count }, (_, i) => addDays(first, i));

describe('streak', () => {
  it('extends once per calendar day', () => {
    const state = practiseDays(['2026-10-01', '2026-10-01', '2026-10-02']);
    expect(state.current).toBe(2);
    expect(state.longest).toBe(2);
    expect(viewStreak(state, '2026-10-02')).toMatchObject({ days: 2, practisedToday: true });
    expect(viewStreak(state, '2026-10-03')).toMatchObject({ days: 2, atRisk: true });
  });

  it('breaks after a missed day with no freezes, keeping the longest', () => {
    const state = practiseDays(['2026-10-01', '2026-10-02', '2026-10-04']);
    expect(state.current).toBe(1);
    expect(state.longest).toBe(2);
    expect(viewStreak(practiseDays(['2026-10-01']), '2026-10-05').days).toBe(0);
  });

  it('earns a freeze every seventh day, capped at the maximum', () => {
    const week = practiseDays(run('2026-10-01', 7));
    expect(week.freezes).toBe(1);
    const month = practiseDays(run('2026-10-01', 28));
    expect(month.freezes).toBe(MAX_FREEZES);
  });

  it('spends freezes to cover a gap and keeps the streak going', () => {
    const two = practiseDays(run('2026-10-01', 14));
    expect(two.freezes).toBe(2);
    // Misses the 15th and 16th, practises on the 17th.
    const after = recordPractice(two, '2026-10-17');
    expect(after.current).toBe(15);
    expect(after.freezes).toBe(0);
    expect(after.frozenDays).toEqual(['2026-10-15', '2026-10-16']);
  });

  it('does not burn freezes on a gap they cannot cover', () => {
    const one = practiseDays(run('2026-10-01', 7));
    const after = reconcile(one, '2026-10-11');
    expect(after.current).toBe(0);
    expect(after.freezes).toBe(1);
    expect(reconcile(after, '2026-10-12')).toBe(after);
  });

  it('is idempotent when reconciled repeatedly', () => {
    const state = practiseDays(run('2026-10-01', 7));
    const once = reconcile(state, '2026-10-09');
    expect(reconcile(once, '2026-10-09')).toEqual(once);
    expect(reconcile(state, '2026-10-08')).toBe(state);
  });

  it('ignores a clock set backwards', () => {
    const state = practiseDays(['2026-10-05']);
    expect(recordPractice(state, '2026-10-03')).toEqual(state);
  });

  it('counts calendar days across DST in the learner zone', () => {
    // New York springs forward on 8 March 2026: that day has 23 hours.
    const clock = createManualClock('2026-03-07T23:30:00-05:00', 'America/New_York');
    let state = recordPractice(emptyStreak, dayKey(clock.now(), clock.timeZone()));
    // 24 real hours later it is already 00:30 on the 9th locally: the 8th was
    // a calendar day the learner skipped, so the streak restarts.
    clock.advance(24 * 3_600_000);
    state = recordPractice(state, dayKey(clock.now(), clock.timeZone()));
    expect(dayKey(clock.now(), clock.timeZone())).toBe('2026-03-09');
    expect(state.current).toBe(1);

    // Practice late on the short day still counts for that day.
    const evening = createManualClock('2026-03-08T22:00:00-04:00', 'America/New_York');
    const late = recordPractice(
      recordPractice(emptyStreak, '2026-03-07'),
      dayKey(evening.now(), evening.timeZone()),
    );
    expect(late.current).toBe(2);
  });

  it('uses the zone at the time of practice when the learner travels', () => {
    const clock = createManualClock('2026-10-01T22:30:00Z', 'Europe/Madrid');
    expect(dayKey(clock.now(), clock.timeZone())).toBe('2026-10-02');
    clock.setTimeZone('America/Los_Angeles');
    expect(dayKey(clock.now(), clock.timeZone())).toBe('2026-10-01');
  });

  it('parses stored state defensively', () => {
    expect(parseStreak(null)).toEqual(emptyStreak);
    expect(parseStreak('{not json')).toEqual(emptyStreak);
    expect(
      parseStreak(JSON.stringify({ current: 4.7, longest: -2, freezes: 9, frozenDays: [1, 'x'] })),
    ).toEqual({
      current: 4,
      longest: 0,
      lastActiveDay: null,
      coveredThrough: null,
      freezes: MAX_FREEZES,
      frozenDays: ['x'],
    });
  });
});
